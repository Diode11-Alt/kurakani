import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from '../lib/auth';
import { redis } from '../lib/redis';
import { db, schema } from '@signal/db';

interface SignalingClient {
  ws: WebSocket;
  userId: string;
  deviceId: number;
}

const clients = new Map<string, SignalingClient>(); // key = `${userId}:${deviceId}`

export function setupSignaling(wss: WebSocketServer) {
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
    clients.set(clientKey, { ws, userId, deviceId });
    await redis.set(`presence:${userId}`, 'online', 'EX', 300);
    broadcastPresence(userId, 'online');
    
    console.log(`[WS] User connected: ${userId}:${deviceId}`);

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
        broadcastPresence(userId, 'offline');
      }
      console.log(`[WS] User disconnected: ${userId}:${deviceId}`);
    });

    ws.on('error', () => clients.delete(clientKey));
  });
}

async function handleMessage(userId: string, deviceId: number, raw: any) {
  let msg: any;
  try { msg = JSON.parse(raw.toString()); } catch { return; }

  switch (msg.type) {
    // ── CALL SIGNALING ───────────────────────────────────────
    case 'call:signal': {
      // msg = { type, callId, targetUserId, signalData, callType (optional) }
      
      // Track call state based on simple-peer signal types
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
      const callStr = await redis.get(`call:${msg.callId}`);
      if (callStr) {
        await redis.del(`call:${msg.callId}`);
      }
      forwardToUser(msg.targetUserId, { ...msg, senderId: userId });
      break;
    }
    // ── MESSAGING ────────────────────────────────────────────
    case 'message:send': {
      try {
        let convId = msg.conversationId;
        
        // If no conversationId is provided, lazily create a direct conversation
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
          ciphertextType: msg.ciphertextType,
        }).returning();

        forwardToUser(msg.recipientId, {
          type: 'message:receive',
          id: inserted[0].id,
          conversationId: convId,
          fromUserId: userId,
          ciphertext: msg.ciphertext,
          ciphertextType: msg.ciphertextType,
          sentAt: inserted[0].sentAt,
        });
      } catch (err) {
        console.error('Error storing message:', err);
      }
      break;
    }
    case 'message:delivered':
    case 'message:read':
      forwardToUser(msg.targetUserId, { ...msg, fromUserId: userId });
      break;
    // ── TYPING ───────────────────────────────────────────────
    case 'typing:start':
    case 'typing:stop':
      forwardToUser(msg.targetUserId, { ...msg, fromUserId: userId });
      break;
  }
}

function forwardToUser(targetUserId: string, payload: object) {
  // Forward to all devices of user
  for (const [key, client] of clients.entries()) {
    if (key.startsWith(`${targetUserId}:`)) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(payload));
      }
    }
  }
}

function broadcastPresence(userId: string, status: 'online' | 'offline') {
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: 'presence', userId, status }));
    }
  }
}
