import { Router } from 'express';
import { db, schema } from '@signal/db';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function generateToken(userId: string, deviceId: number) {
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev';
  return jwt.sign({ userId, deviceId }, secret, { expiresIn: '30d' });
}

// 1. Register Endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, phoneNumber, serverPayload } = req.body;
    
    if (!email || !password || !serverPayload) {
      return res.status(400).json({ error: 'email, password, and serverPayload are required' });
    }

    // Check if email exists
    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (user) {
      return res.status(400).json({ error: 'Email already exists. Please log in.' });
    }

    const proposedUsername = username || email.split('@')[0];
    let existingUsername = await db.query.users.findFirst({
      where: eq(schema.users.username, proposedUsername),
    });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different one.' });
    }

    if (phoneNumber) {
      let existingPhone = await db.query.users.findFirst({
        where: eq(schema.users.phoneNumber, phoneNumber),
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'Phone number already exists.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const inserted = await db.insert(schema.users).values({
      email,
      passwordHash,
      username: proposedUsername,
      phoneNumber: phoneNumber || null,
      registrationId: serverPayload.registrationId,
    }).returning();

    user = inserted[0];

    // Insert Identity Key
    await db.insert(schema.identityKeys).values({
      userId: user.id,
      deviceId: 1,
      identityKey: serverPayload.identityKey,
      signedPreKey: serverPayload.signedPreKey,
    });

    // Insert One-Time PreKeys
    const preKeysArray = serverPayload.preKeys || serverPayload.oneTimePreKeys;
    if (preKeysArray && preKeysArray.length > 0) {
      const preKeysToInsert = preKeysArray.map((pk: any) => ({
        userId: user!.id,
        deviceId: 1,
        keyId: pk.keyId,
        publicKey: pk.publicKey,
      }));
      await db.insert(schema.oneTimePreKeys).values(preKeysToInsert);
    }

    const token = generateToken(user.id, 1);
    
    await db.insert(schema.sessions).values({
      userId: user.id,
      deviceId: 1,
      token,
      platform: 'web',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.json({ success: true, token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Login Endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password, serverPayload } = req.body;
    
    if (!email || !password || !serverPayload) {
      return res.status(400).json({ error: 'email, password, and serverPayload are required' });
    }

    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please sign up.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Insert/Update Identity Key for this device session
    await db.delete(schema.identityKeys).where(and(
      eq(schema.identityKeys.userId, user.id),
      eq(schema.identityKeys.deviceId, 1)
    ));
    await db.insert(schema.identityKeys).values({
      userId: user.id,
      deviceId: 1,
      identityKey: serverPayload.identityKey,
      signedPreKey: serverPayload.signedPreKey,
    });

    // Update One-Time PreKeys
    await db.delete(schema.oneTimePreKeys).where(and(
      eq(schema.oneTimePreKeys.userId, user.id),
      eq(schema.oneTimePreKeys.deviceId, 1)
    ));
    const preKeysArray = serverPayload.preKeys || serverPayload.oneTimePreKeys;
    if (preKeysArray && preKeysArray.length > 0) {
      const preKeysToInsert = preKeysArray.map((pk: any) => ({
        userId: user!.id,
        deviceId: 1,
        keyId: pk.keyId,
        publicKey: pk.publicKey,
      }));
      await db.insert(schema.oneTimePreKeys).values(preKeysToInsert);
    }

    const token = generateToken(user.id, 1);
    
    // Invalidate old session for this device
    await db.delete(schema.sessions).where(and(
      eq(schema.sessions.userId, user.id),
      eq(schema.sessions.deviceId, 1)
    ));

    await db.insert(schema.sessions).values({
      userId: user.id,
      deviceId: 1,
      token,
      platform: 'web',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.json({ success: true, token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1.5 Search for user (to initiate conversation)
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') return res.status(400).json({ error: 'Phone number required' });

    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.phoneNumber, phone),
    });

    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    // Don't send sensitive keys here, just basic info
    res.json({ id: targetUser.id, username: targetUser.username, phoneNumber: targetUser.phoneNumber });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. Fetch Keys to start a conversation
router.get('/keys/:phoneNumber', requireAuth, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.phoneNumber, phoneNumber),
    });

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Fetch primary device (device_id = 1 usually)
    const idKey = await db.query.identityKeys.findFirst({
      where: eq(schema.identityKeys.userId, targetUser.id),
    });

    if (!idKey) return res.status(404).json({ error: 'Keys not found' });

    // Fetch ONE unused prekey
    const [otp] = await db.update(schema.oneTimePreKeys)
      .set({ used: true })
      .where(eq(schema.oneTimePreKeys.userId, targetUser.id))
      .returning();

    res.json({
      registrationId: targetUser.registrationId,
      identityKey: idKey.identityKey,
      signedPreKey: idKey.signedPreKey,
      preKey: otp ? {
        keyId: otp.keyId,
        publicKey: otp.publicKey
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. Logout
router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const deviceId = req.user?.deviceId;
    
    if (!userId || !deviceId) {
      return res.status(400).json({ error: 'User context missing' });
    }

    // Wipe keys for this device
    await db.delete(schema.identityKeys)
      .where(and(eq(schema.identityKeys.userId, userId), eq(schema.identityKeys.deviceId, deviceId)));
    
    await db.delete(schema.oneTimePreKeys)
      .where(and(eq(schema.oneTimePreKeys.userId, userId), eq(schema.oneTimePreKeys.deviceId, deviceId)));
      
    await db.delete(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), eq(schema.sessions.deviceId, deviceId)));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
