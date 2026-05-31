import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from '../lib/auth';
import { redis } from '../lib/redis';
import { db, schema } from '@signal/db';

interface SignalingClient {
  ws: WebSocket;
  userId: string;
  deviceId: number;
  isAlive: boolean;
}

const clients = new Map<string, SignalingClient>(); // key = `${userId}:${deviceId}`

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const HEARTBEAT_TIMEOUT = 10_000;  // 10 seconds to respond

export function setupSignaling(wss: WebSocketServer) {
  // ─── Heartbeat interval ─────────────────────────────────
  const heartbeatTimer = setInterval(() => {
    for (const [key, client] of clients.entries()) {
      if (!client.isAlive) {
        // No pong received — terminate dead connection
        console.log(`[WS] Heartbeat timeout, terminating: ${key}`);
        client.ws.terminate();
        clients.delete(key);
        continue;
      }

      client.isAlive = false;
      client.ws.ping();
    }
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => clearInterval(heartbeatTimer));

  // ─── Connection handler ─────────────────────────────────
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, 'ws://localhost');
    const token = url.searchParams.get('token');
    if (!token) { ws.close(4001, 'Unauthorized'); return; }

    let userId: string, deviceId: number;
    try {
      ({ userId, deviceId } = verifyToken(token));
    } catch {
      ws.close(4001, 'Invalid token'); return;
    }

    const clientKey = `${userId}:${deviceId}`;
    clients.set(clientKey, { ws, userId, deviceId, isAlive: true });
    await redis.set(`presence:${userId}`, 'online', 'EX', 300);
    broadcastPresence(userId, 'online');
    
    console.log(`[WS] Connected: ${clientKey}`);

    // Respond to pong with isAlive flag
    ws.on('pong', () => {
      const client = clients.get(clientKey);
      if (client) client.isAlive = true;
    });

    ws.on('message', (raw) => handleMessage(userId, deviceId, raw));

    ws.on('close', async () => {
      clients.delete(clientKey);
      
      // Check if user has other active connections
      let hasOtherConnections = false;
      for (const key of clients.keys()) {
        if (key.startsWith(`${userId}:`)) {
          hasOtherConnections = true;
          break;
        }
      }
      
      if (!hasOtherConnections) {
        await redis.del(`presence:${userId}`);
        // Update last seen
        try {
          await db.update(schema.users)
            .set({ lastSeenAt: new Date() })
            .where(require('drizzle-orm').eq(schema.users.id, userId));
        } catch {}
        broadcastPresence(userId, 'offline');
      }
      console.log(`[WS] Disconnected: ${clientKey}`);
    });

    ws.on('error', () => clients.delete(clientKey));
  });
}

async function handleMessage(userId: string, deviceId: number, raw: any) {
  let msg: any;
  try { msg = JSON.parse(raw.toString()); } catch { return; }

  switch (msg.type) {
    // ── PING/PONG ─────────────────────────────────────────
    case 'ping': {
      const client = clients.get(`${userId}:${deviceId}`);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: 'pong' }));
      }
      break;
    }

    // ── CALL SIGNALING ────────────────────────────────────
    case 'call:signal': {
      if (msg.signalData?.type === 'offer') {
        await redis.set(`call:${msg.callId}`, JSON.stringify({
          callId: msg.callId,
          initiatorId: userId,
          targetId: msg.targetUserId,
          callType: msg.callType || 'video',
          status: 'ringing',
          startedAt: Date.now(),
        }), 'EX', 120);
      } else if (msg.signalData?.type === 'answer') {
        const callStr = await redis.get(`call:${msg.callId}`);
        if (callStr) {
          const call = JSON.parse(callStr);
          await redis.set(`call:${msg.callId}`, JSON.stringify({ ...call, status: 'active' }), 'EX', 14400);
        }
      }
      
      forwardToUser(msg.targetUserId, { ...msg, senderId: userId });
      break;
    }
    case 'call:reject':
    case 'call:hangup': {
      await redis.del(`call:${msg.callId}`);
      forwardToUser(msg.targetUserId, { ...msg, senderId: userId });
      break;
    }

    // ── MESSAGING ─────────────────────────────────────────
    case 'message:send': {
      try {
        let convId = msg.conversationId;
        const { eq } = require('drizzle-orm');
        
        // Lazily create direct conversation if none provided
        if (!convId && msg.recipientId) {
          const insertedConv = await db.insert(schema.conversations).values({
            type: 'direct',
          }).returning();
          convId = insertedConv[0].id;
          
          await db.insert(schema.conversationMembers).values([
            { conversationId: convId, userId: userId },
            { conversationId: convId, userId: msg.recipientId }
          ]);
        }

        const inserted = await db.insert(schema.messages).values({
          senderId: userId,
          conversationId: convId,
          ciphertext: msg.ciphertext,
          ciphertextType: msg.ciphertextType || 1,
          expiresAt: msg.expiresIn ? new Date(Date.now() + msg.expiresIn * 1000) : null,
        }).returning();

        const payload = {
          type: 'message:receive',
          id: inserted[0].id,
          conversationId: convId,
          fromUserId: userId,
          ciphertext: msg.ciphertext,
          ciphertextType: msg.ciphertextType,
          sentAt: inserted[0].sentAt,
        };

        // Try live delivery first
        const delivered = forwardToUser(msg.recipientId, payload);

        // If not online, queue in Redis
        if (!delivered) {
          await redis.lpush(
            `messages:pending:${msg.recipientId}`,
            JSON.stringify(payload)
          );
        }
      } catch (err) {
        console.error('[WS] Error storing message:', err);
      }
      break;
    }

    case 'message:delivered':
    case 'message:read':
      forwardToUser(msg.targetUserId, { ...msg, fromUserId: userId });
      break;

    // ── TYPING ────────────────────────────────────────────
    case 'typing:start':
    case 'typing:stop':
      forwardToUser(msg.targetUserId, { ...msg, fromUserId: userId });
      break;
  }
}

/**
 * Forward a payload to all devices of a user.
 * Returns true if at least one device was online and received it.
 */
function forwardToUser(targetUserId: string, payload: object): boolean {
  let delivered = false;
  for (const [key, client] of clients.entries()) {
    if (key.startsWith(`${targetUserId}:`)) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(payload));
        delivered = true;
      }
    }
  }
  return delivered;
}

function broadcastPresence(userId: string, status: 'online' | 'offline') {
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: 'presence', userId, status }));
    }
  }
}
