import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// Retrieve temporary TURN server credentials
router.get('/', (req, res) => {
  const turnSecret = process.env.TURN_SECRET || '8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e';
  // Standard COTURN long-term credentials mechanism
  // username is a unix timestamp (valid for 1 day)
  const timestamp = Math.floor(Date.now() / 1000) + 24 * 3600;
  const username = timestamp.toString();

  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.setEncoding('base64');
  hmac.write(username);
  hmac.end();
  const password = hmac.read();

  res.json({
    username,
    password,
    uris: [
      'turn:turn.signal-clone.local:3478?transport=udp',
      'turn:turn.signal-clone.local:3478?transport=tcp'
    ]
  });
});

export default router;
