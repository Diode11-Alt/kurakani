import { Router } from 'express';
import { db, schema } from '@signal/db';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { registerSchema, loginSchema, refreshSchema } from '../lib/validation';
import { redis } from '../lib/redis';
import crypto from 'crypto';

const router = Router();

const PHONE_PEPPER = process.env.PHONE_PEPPER || 'kurakani-secure-pepper';

function hashPhoneNumber(phone: string): string {
  return crypto.createHash('sha256').update(phone + PHONE_PEPPER).digest('hex');
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function generateAccessToken(userId: string, deviceId: number) {
  return jwt.sign({ userId, deviceId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

function generateRefreshToken(userId: string, deviceId: number) {
  return jwt.sign({ userId, deviceId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
}

// ─── POST /api/auth/register ──────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { email, password, username, phoneNumber, serverPayload } = parsed.data;

    // Check email
    const existingEmail = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check username
    const existingUsername = await db.query.users.findFirst({
      where: eq(schema.users.username, username),
    });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check phone if provided
    let phoneHash: string | null = null;
    if (phoneNumber) {
      phoneHash = hashPhoneNumber(phoneNumber);
      const existingPhone = await db.query.users.findFirst({
        where: eq(schema.users.phoneHash, phoneHash),
      });
      if (existingPhone) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    // Hash password with bcrypt cost 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [user] = await db.insert(schema.users).values({
      email,
      passwordHash,
      username,
      phoneHash,
      registrationId: serverPayload.registrationId,
    }).returning();

    // Store identity key
    await db.insert(schema.identityKeys).values({
      userId: user.id,
      deviceId: 1,
      identityKey: serverPayload.identityKey,
    });

    if (serverPayload.signedPreKey) {
      await db.insert(schema.signedPreKeys).values({
        userId: user.id,
        deviceId: 1,
        keyId: serverPayload.signedPreKey.keyId,
        publicKey: serverPayload.signedPreKey.publicKey,
        signature: serverPayload.signedPreKey.signature,
      });
    }

    // Store one-time pre-keys
    const preKeysArray = serverPayload.preKeys || serverPayload.oneTimePreKeys;
    if (preKeysArray && preKeysArray.length > 0) {
      await db.insert(schema.oneTimePreKeys).values(
        preKeysArray.map(pk => ({
          userId: user.id,
          deviceId: 1,
          keyId: pk.keyId,
          publicKey: pk.publicKey,
        }))
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, 1);
    const refreshToken = generateRefreshToken(user.id, 1);

    // Store refresh token in Redis with TTL (7 days)
    await redis.set(`refresh_token:${user.id}:${refreshToken}`, '1', 'EX', 7 * 24 * 60 * 60);

    // Store session
    await db.insert(schema.sessions).values({
      userId: user.id,
      deviceId: 1,
      token: accessToken,
      platform: 'web',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Create default settings
    await db.insert(schema.userSettings).values({ userId: user.id });

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        registrationId: user.registrationId,
      },
    });
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { email, password, serverPayload } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    // Same error for wrong email AND wrong password — never reveal which
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is deactivated
    if (!user.isActive) {
      // Reactivate — cancel deletion
      await db.update(schema.users)
        .set({ isActive: true, deletionScheduledAt: null })
        .where(eq(schema.users.id, user.id));
    }

    // Update identity key for this device
    await db.delete(schema.identityKeys).where(and(
      eq(schema.identityKeys.userId, user.id),
      eq(schema.identityKeys.deviceId, 1)
    ));
    await db.insert(schema.identityKeys).values({
      userId: user.id,
      deviceId: 1,
      identityKey: serverPayload.identityKey,
    });

    // Update signed pre-key
    await db.delete(schema.signedPreKeys).where(and(
      eq(schema.signedPreKeys.userId, user.id),
      eq(schema.signedPreKeys.deviceId, 1)
    ));
    if (serverPayload.signedPreKey) {
      await db.insert(schema.signedPreKeys).values({
        userId: user.id,
        deviceId: 1,
        keyId: serverPayload.signedPreKey.keyId,
        publicKey: serverPayload.signedPreKey.publicKey,
        signature: serverPayload.signedPreKey.signature,
      });
    }

    // Update one-time pre-keys
    await db.delete(schema.oneTimePreKeys).where(and(
      eq(schema.oneTimePreKeys.userId, user.id),
      eq(schema.oneTimePreKeys.deviceId, 1)
    ));
    const preKeysArray = serverPayload.preKeys || serverPayload.oneTimePreKeys;
    if (preKeysArray && preKeysArray.length > 0) {
      await db.insert(schema.oneTimePreKeys).values(
        preKeysArray.map(pk => ({
          userId: user.id,
          deviceId: 1,
          keyId: pk.keyId,
          publicKey: pk.publicKey,
        }))
      );
    }

    const accessToken = generateAccessToken(user.id, 1);
    const refreshToken = generateRefreshToken(user.id, 1);

    // Store refresh token in Redis
    await redis.set(`refresh_token:${user.id}:${refreshToken}`, '1', 'EX', 7 * 24 * 60 * 60);

    // Invalidate old session and create new
    await db.delete(schema.sessions).where(and(
      eq(schema.sessions.userId, user.id),
      eq(schema.sessions.deviceId, 1)
    ));
    await db.insert(schema.sessions).values({
      userId: user.id,
      deviceId: 1,
      token: accessToken,
      platform: 'web',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        registrationId: user.registrationId,
      },
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const { refreshToken } = parsed.data;

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Check if refresh token exists in Redis (not revoked)
    const exists = await redis.get(`refresh_token:${decoded.userId}:${refreshToken}`);
    if (!exists) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    // Invalidate old refresh token
    await redis.del(`refresh_token:${decoded.userId}:${refreshToken}`);

    // Generate new token pair
    const newAccessToken = generateAccessToken(decoded.userId, decoded.deviceId);
    const newRefreshToken = generateRefreshToken(decoded.userId, decoded.deviceId);

    // Store new refresh token
    await redis.set(`refresh_token:${decoded.userId}:${newRefreshToken}`, '1', 'EX', 7 * 24 * 60 * 60);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('[Refresh Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/auth/search ─────────────────────────────────
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') return res.status(400).json({ error: 'Phone number required' });

    const phoneHash = hashPhoneNumber(phone);
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.phoneHash, phoneHash),
    });

    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    // We intentionally do not return the phone number hash
    res.json({ id: targetUser.id, username: targetUser.username });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/auth/keys/:phoneNumber ──────────────────────
// Legacy endpoint — prefer /api/keys/:userId
router.get('/keys/:phoneNumber', requireAuth, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    const phoneHash = hashPhoneNumber(phoneNumber);
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.phoneHash, phoneHash),
    });

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const idKey = await db.query.identityKeys.findFirst({
      where: eq(schema.identityKeys.userId, targetUser.id),
    });

    if (!idKey) return res.status(404).json({ error: 'Keys not found' });

    // Fetch ONE unused prekey atomically
    const [otp] = await db.update(schema.oneTimePreKeys)
      .set({ used: true, usedAt: new Date() })
      .where(and(
        eq(schema.oneTimePreKeys.userId, targetUser.id),
        eq(schema.oneTimePreKeys.used, false)
      ))
      .returning();

    const signedPreKeyResult = await db.query.signedPreKeys.findFirst({
      where: and(
        eq(schema.signedPreKeys.userId, targetUser.id),
        eq(schema.signedPreKeys.deviceId, 1)
      )
    });

    res.json({
      registrationId: targetUser.registrationId,
      identityKey: idKey.identityKey,
      signedPreKey: signedPreKeyResult ? {
        keyId: signedPreKeyResult.keyId,
        publicKey: signedPreKeyResult.publicKey,
        signature: signedPreKeyResult.signature
      } : null,
      preKey: otp ? { keyId: otp.keyId, publicKey: otp.publicKey } : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────
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

    // Invalidate all refresh tokens for this user
    const keys = await redis.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
