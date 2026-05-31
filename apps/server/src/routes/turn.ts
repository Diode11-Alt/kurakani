import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/turn — Retrieve temporary TURN server credentials
// Uses HMAC time-limited credentials per RFC 5766
router.get('/', requireAuth, (req: AuthRequest, res) => {
  const turnSecret = process.env.TURN_SECRET;
  if (!turnSecret) {
    return res.status(503).json({ error: 'TURN server not configured' });
  }

  const userId = req.user!.userId;
  const turnHost = process.env.TURN_SERVER_HOST || 'localhost';
  const turnPort = process.env.TURN_SERVER_PORT || '3478';

  // Username format: timestamp:userId — valid for 24 hours
  const timestamp = Math.floor(Date.now() / 1000) + 86400;
  const username = `${timestamp}:${userId}`;

  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  res.json({
    iceServers: [
      { urls: `stun:${turnHost}:${turnPort}` },
      {
        urls: [
          `turn:${turnHost}:${turnPort}?transport=udp`,
          `turn:${turnHost}:${turnPort}?transport=tcp`,
        ],
        username,
        credential,
      },
    ],
  });
});

export default router;
