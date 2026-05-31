import { Router } from 'express';
import { db, schema } from '@signal/db';
import { eq, and, lt, desc, sql, inArray } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { sendMessageSchema } from '../lib/validation';
import { redis, pubClient } from '../lib/redis';
import { Emitter } from '@socket.io/redis-emitter';

const io = new Emitter(pubClient);

const router = Router();

// ─── POST /api/messages ───────────────────────────────────
// Send an encrypted message
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const senderId = req.user!.userId;

    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid message', details: parsed.error.flatten() });
    }

    const { recipientId, conversationId, ciphertext, ciphertextType, contentType, sealedSender, expiresIn } = parsed.data;

    // recipientId can now be a string (1-on-1) or an array of strings (multi-cast group fan-out)
    const targetUserIds = Array.isArray(recipientId) ? recipientId : [recipientId];
    
    // Verify recipients exist
    const recipients = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.id, targetUserIds));
      
    if (recipients.length !== targetUserIds.length) {
      return res.status(404).json({ error: 'One or more recipients not found' });
    }

    // Find or create conversation
    let convId = conversationId;
    if (!convId) {
      if (sealedSender) {
        return res.status(400).json({ error: 'conversationId is required for sealed sender messages' });
      }

      // Check if a direct conversation already exists between these users
      const existingConvs = await db.select({ conversationId: schema.conversationMembers.conversationId })
        .from(schema.conversationMembers)
        .where(eq(schema.conversationMembers.userId, senderId));

      const recipientConvs = await db.select({ conversationId: schema.conversationMembers.conversationId })
        .from(schema.conversationMembers)
        .where(eq(schema.conversationMembers.userId, recipientId));

      const senderConvIds = new Set(existingConvs.map(c => c.conversationId));
      const sharedConv = recipientConvs.find(c => senderConvIds.has(c.conversationId));

      if (sharedConv) {
        // Verify it's a direct conversation
        const conv = await db.query.conversations.findFirst({
          where: and(
            eq(schema.conversations.id, sharedConv.conversationId),
            eq(schema.conversations.type, 'direct')
          ),
        });
        if (conv) convId = conv.id;
      }

      if (!convId) {
        // Create new direct conversation
        const [newConv] = await db.insert(schema.conversations).values({
          type: 'direct',
          createdBy: senderId,
        }).returning();
        convId = newConv.id;

        await db.insert(schema.conversationMembers).values([
          { conversationId: convId, userId: senderId },
          { conversationId: convId, userId: targetUserIds[0] }, // fallback to first target for direct
        ]);
      }
    }

    // Store message (ciphertext only — no decryption)
    // If sealedSender is present, we enforce zero-knowledge of the sender
    const dbSenderId = sealedSender ? null : senderId;

    const [message] = await db.insert(schema.messages).values({
      conversationId: convId,
      senderId: dbSenderId,
      ciphertext,
      ciphertextType,
      contentType: contentType || 'text',
      sealedSender: sealedSender || null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    }).returning();

    // Update conversation's updatedAt
    await db.update(schema.conversations)
      .set({ updatedAt: new Date() })
      .where(eq(schema.conversations.id, convId));

    // Queue for offline delivery via Redis or push immediately if online
    const wsPayload = {
      type: 'message:receive',
      id: message.id,
      conversationId: convId,
      fromUserId: dbSenderId,
      ciphertext,
      ciphertextType,
      sentAt: message.sentAt,
    };

    // Fan-out to all target participants
    for (const targetId of targetUserIds) {
      const isOnline = await redis.get(`presence:${targetId}`);
      if (!isOnline) {
        await redis.lpush(`messages:pending:${targetId}`, JSON.stringify({
          messageId: message.id,
          conversationId: convId,
          senderId: dbSenderId,
          ciphertext,
          ciphertextType,
          contentType,
          sentAt: message.sentAt,
        }));
      } else {
        // Publish via Socket.io Redis Emitter
        io.to(`user_${targetId}`).emit('message:receive', wsPayload);
      }
    }

    res.status(201).json({
      messageId: message.id,
      conversationId: convId,
      timestamp: message.sentAt,
    });
  } catch (error) {
    console.error('[Message Send Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/conversations ───────────────────────────────
// Get all conversations for current user
router.get('/conversations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Get all conversation IDs for user
    const memberships = await db.select()
      .from(schema.conversationMembers)
      .where(eq(schema.conversationMembers.userId, userId));

    if (memberships.length === 0) {
      return res.json({ conversations: [] });
    }

    const convIds = memberships.map(m => m.conversationId);

    // Get conversation details and all members concurrently
    const [convs, allMembers] = await Promise.all([
      db.select()
        .from(schema.conversations)
        .where(inArray(schema.conversations.id, convIds))
        .orderBy(desc(schema.conversations.updatedAt)),
      db.select({
        conversationId: schema.conversationMembers.conversationId,
        userId: schema.conversationMembers.userId,
        role: schema.conversationMembers.role,
      })
        .from(schema.conversationMembers)
        .where(inArray(schema.conversationMembers.conversationId, convIds))
    ]);

    // Get user details for members
    const memberUserIds = [...new Set(allMembers.map(m => m.userId))];
    const memberUsers = memberUserIds.length > 0
      ? await db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatarUrl: schema.users.avatarUrl,
        })
          .from(schema.users)
          .where(inArray(schema.users.id, memberUserIds))
      : [];

    const userMap = new Map(memberUsers.map(u => [u.id, u]));

    const conversations = convs.map(conv => ({
      id: conv.id,
      type: conv.type,
      name: conv.name,
      avatarUrl: conv.avatarUrl,
      updatedAt: conv.updatedAt,
      members: allMembers
        .filter(m => m.conversationId === conv.id)
        .map(m => ({
          ...userMap.get(m.userId),
          role: m.role,
        })),
    }));

    res.json({ conversations });
  } catch (error) {
    console.error('[Conversations List Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/conversations/:id/messages ──────────────────
// Get messages in a conversation (paginated, cursor-based)
router.get('/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const conversationId = req.params.id;
    const before = req.query.before as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 50);

    // Verify user is a member
    const membership = await db.query.conversationMembers.findFirst({
      where: and(
        eq(schema.conversationMembers.conversationId, conversationId),
        eq(schema.conversationMembers.userId, userId)
      ),
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this conversation' });

    let query = db.select()
      .from(schema.messages)
      .where(
        before
          ? and(
              eq(schema.messages.conversationId, conversationId),
              lt(schema.messages.sentAt, new Date(before))
            )
          : eq(schema.messages.conversationId, conversationId)
      )
      .orderBy(desc(schema.messages.sentAt))
      .limit(limit + 1); // Fetch one extra to check hasMore

    const msgs = await query;

    const hasMore = msgs.length > limit;
    const messages = msgs.slice(0, limit).map(m => ({
      id: m.id,
      senderId: m.senderId,
      ciphertext: m.ciphertext,
      ciphertextType: m.ciphertextType,
      contentType: m.contentType,
      sealedSender: m.sealedSender,
      sentAt: m.sentAt,
      deliveredAt: m.deliveredAt,
      readAt: m.readAt,
    }));

    res.json({
      messages,
      hasMore,
      nextCursor: hasMore ? messages[messages.length - 1]?.sentAt?.toISOString() : null,
    });
  } catch (error) {
    console.error('[Messages List Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/messages/pending ────────────────────────────
// Get messages queued while offline
router.get('/pending', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const key = `messages:pending:${userId}`;

    const pendingRaw = await redis.lrange(key, 0, -1);
    const messages = pendingRaw.map(raw => {
      try { return JSON.parse(raw); } catch { return null; }
    }).filter(Boolean);

    // Clear the queue after reading
    if (messages.length > 0) {
      await redis.del(key);
    }

    res.json({ messages, count: messages.length });
  } catch (error) {
    console.error('[Pending Messages Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/messages/:id/read ───────────────────────────
// Mark a message as read
router.put('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const messageId = req.params.id;

    await db.update(schema.messages)
      .set({ readAt: new Date() })
      .where(eq(schema.messages.id, messageId));

    res.json({ success: true });
  } catch (error) {
    console.error('[Message Read Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
