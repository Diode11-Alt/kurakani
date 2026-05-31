import { Router } from 'express';
import { db, schema } from '@signal/db';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { redis } from '../lib/redis';

const router = Router();

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).min(1),
  skdms: z.record(z.string(), z.string()).optional(), // map of memberId -> SKDM ciphertext
});

// ─── POST /api/groups ──────────────────────────────────────
// Create a new group and distribute Sender Key Distribution Messages
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const creatorId = req.user!.userId;

    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid group data', details: parsed.error.flatten() });
    }

    const { name, memberIds, skdms } = parsed.data;
    
    // Add creator to member list implicitly if not present
    const allMembers = new Set([...memberIds, creatorId]);

    // Create group conversation
    const [conv] = await db.insert(schema.conversations).values({
      type: 'group',
      name,
      createdBy: creatorId,
    }).returning();

    // Add members
    const membersToInsert = Array.from(allMembers).map(userId => ({
      conversationId: conv.id,
      userId,
      role: userId === creatorId ? 'admin' : 'member',
    }));

    await db.insert(schema.conversationMembers).values(membersToInsert);

    // If SKDMs are provided, distribute them
    if (skdms) {
      for (const [memberId, skdmCiphertext] of Object.entries(skdms)) {
        if (memberId === creatorId) continue; // Don't send SKDM to self

        const messagePayload = {
          type: 'group:skdm',
          conversationId: conv.id,
          fromUserId: creatorId,
          ciphertext: skdmCiphertext,
          sentAt: new Date(),
        };

        const isOnline = await redis.get(`presence:${memberId}`);
        if (!isOnline) {
          await redis.lpush(`messages:pending:${memberId}`, JSON.stringify(messagePayload));
        } else {
          const { pubClient } = require('../lib/redis');
          pubClient.publish('ws:messages', JSON.stringify({ 
            targetUserId: memberId, 
            payload: messagePayload 
          }));
        }
      }
    }

    res.status(201).json({
      groupId: conv.id,
      name: conv.name,
    });
  } catch (error) {
    console.error('[Group Create Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
