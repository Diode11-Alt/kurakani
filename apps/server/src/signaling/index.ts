import { Server as SocketIOServer } from 'socket.io';
import { IncomingMessage, Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { verifyToken } from '../lib/auth';
import { redis, pubClient, subClient } from '../lib/redis';
import { db, schema } from '@signal/db';

export function setupSignaling(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'https://localhost:3000'],
      credentials: true,
    },
  });

  // Use Redis adapter for cross-instance Pub/Sub fan-out
  io.adapter(createAdapter(pubClient, subClient));

  // Middleware for Authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    try {
      const { userId, deviceId } = verifyToken(token as string);
      socket.data.userId = userId;
      socket.data.deviceId = deviceId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, deviceId } = socket.data;
    
    // Join a room specific to this user for multi-device sync
    const userRoom = `user_${userId}`;
    socket.join(userRoom);
    
    console.log(`[Socket.io] Connected: ${userId}:${deviceId}`);

    // Update global presence state
    await redis.set(`presence:${userId}`, 'online', 'EX', 300);
    
    // Broadcast presence update (could use a global presence namespace if needed)
    io.emit('presence', { userId, status: 'online' });

    // Handle incoming WebRTC signaling (call-initiate, webrtc-offer, webrtc-answer, ice-candidate)
    socket.on('call-initiate', async (data) => {
      await redis.set(`call:${data.callId}`, JSON.stringify({
        callId: data.callId,
        initiatorId: userId,
        targetId: data.targetUserId,
        callType: data.callType || 'video',
        status: 'ringing',
        startedAt: Date.now(),
      }), 'EX', 120);

      // Route the event directly to the target user's multi-device room
      io.to(`user_${data.targetUserId}`).emit('call-initiate', { ...data, senderId: userId });
    });

    socket.on('webrtc-offer', async (data) => {
      const callStr = await redis.get(`call:${data.callId}`);
      if (callStr) {
        const call = JSON.parse(callStr);
        await redis.set(`call:${data.callId}`, JSON.stringify({ ...call, status: 'active' }), 'EX', 14400);
      }
      io.to(`user_${data.targetUserId}`).emit('webrtc-offer', { ...data, senderId: userId });
    });

    socket.on('webrtc-answer', (data) => {
      io.to(`user_${data.targetUserId}`).emit('webrtc-answer', { ...data, senderId: userId });
    });

    socket.on('ice-candidate', (data) => {
      io.to(`user_${data.targetUserId}`).emit('ice-candidate', { ...data, senderId: userId });
    });

    socket.on('call-reject', async (data) => {
      await redis.del(`call:${data.callId}`);
      io.to(`user_${data.targetUserId}`).emit('call-reject', { ...data, senderId: userId });
    });

    socket.on('call-hangup', async (data) => {
      await redis.del(`call:${data.callId}`);
      io.to(`user_${data.targetUserId}`).emit('call-hangup', { ...data, senderId: userId });
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      io.to(`user_${data.targetUserId}`).emit('typing:start', { ...data, fromUserId: userId });
    });

    socket.on('typing:stop', (data) => {
      io.to(`user_${data.targetUserId}`).emit('typing:stop', { ...data, fromUserId: userId });
    });

    // Handle delivery/read receipts
    socket.on('message:delivered', (data) => {
      io.to(`user_${data.targetUserId}`).emit('message:delivered', { ...data, fromUserId: userId });
    });

    socket.on('message:read', (data) => {
      io.to(`user_${data.targetUserId}`).emit('message:read', { ...data, fromUserId: userId });
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      // Check if user still has other connected devices in this instance or cluster
      // io.in(userRoom).allSockets() fetches across the Redis cluster
      const connectedSockets = await io.in(userRoom).allSockets();
      if (connectedSockets.size === 0) {
        await redis.del(`presence:${userId}`);
        
        try {
          await db.update(schema.users)
            .set({ lastSeenAt: new Date() })
            .where(require('drizzle-orm').eq(schema.users.id, userId));
        } catch (err) {}
        
        io.emit('presence', { userId, status: 'offline' });
      }
      
      console.log(`[Socket.io] Disconnected: ${userId}:${deviceId}`);
    });
  });

  return io;
}
