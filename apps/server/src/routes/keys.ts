import { Router } from 'express';
import { db, schema } from '@signal/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { keyBundleSchema, additionalPreKeysSchema } from '../lib/validation';
import nacl from 'tweetnacl';

const router = Router();

// ─── POST /api/keys/register ──────────────────────────────
// Upload key bundle after registration or device enrollment
router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const deviceId = req.user!.deviceId;

    const parsed = keyBundleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid key bundle', details: parsed.error.flatten() });
    }

    const { identityKey, signedPreKey, oneTimePreKeys } = parsed.data;

    // Verify the signedPreKey signature using the identityKey
    try {
      const spkPub = Buffer.from(signedPreKey.publicKey, 'base64');
      const sig = Buffer.from(signedPreKey.signature, 'base64');
      const idPub = Buffer.from(identityKey, 'base64');

      const isValid = nacl.sign.detached.verify(spkPub, sig, idPub);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid signed pre-key signature' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Malformed keys or signature' });
    }

    // Upsert identity key
    await db.delete(schema.identityKeys).where(
      and(eq(schema.identityKeys.userId, userId), eq(schema.identityKeys.deviceId, deviceId))
    );
    await db.insert(schema.identityKeys).values({
      userId,
      deviceId,
      identityKey,
    });

    await db.delete(schema.signedPreKeys).where(
      and(eq(schema.signedPreKeys.userId, userId), eq(schema.signedPreKeys.deviceId, deviceId))
    );
    await db.insert(schema.signedPreKeys).values({
      userId,
      deviceId,
      keyId: signedPreKey.keyId,
      publicKey: signedPreKey.publicKey,
      signature: signedPreKey.signature,
    });

    // Bulk insert OTPKs
    if (oneTimePreKeys.length > 0) {
      const preKeysToInsert = oneTimePreKeys.map(pk => ({
        userId,
        deviceId,
        keyId: pk.keyId,
        publicKey: pk.publicKey,
      }));
      await db.insert(schema.oneTimePreKeys).values(preKeysToInsert);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Keys Register Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/keys/:userId ────────────────────────────────
// Fetch a user's key bundle to initiate a session
// CRITICAL: OTPK consumption must be atomic to prevent race conditions
router.get('/:userId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.params.userId;

    // Get user's registration ID
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.id, targetUserId),
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Get identity key
    const idKey = await db.query.identityKeys.findFirst({
      where: eq(schema.identityKeys.userId, targetUserId),
    });
    if (!idKey) return res.status(404).json({ error: 'Keys not found for user' });

    // Atomically consume one OTPK using a subquery with FOR UPDATE SKIP LOCKED
    const result = await db.execute(sql`
      UPDATE one_time_pre_keys 
      SET used = true, used_at = NOW() 
      WHERE id = (
        SELECT id FROM one_time_pre_keys 
        WHERE user_id = ${targetUserId} AND used = false 
        LIMIT 1 
        FOR UPDATE SKIP LOCKED
      ) 
      RETURNING key_id, public_key
    `);

    let oneTimePreKey = null;
    const rows = result as unknown as any[];
    if (rows.length > 0) {
      oneTimePreKey = {
        keyId: rows[0].key_id as number,
        publicKey: rows[0].public_key as string,
      };

      // Check if OTPK count is low — notify user's device
      const remainingCount = await db.select({ count: sql<number>`count(*)` })
        .from(schema.oneTimePreKeys)
        .where(
          and(
            eq(schema.oneTimePreKeys.userId, targetUserId),
            eq(schema.oneTimePreKeys.used, false)
          )
        );

      if (remainingCount[0] && Number(remainingCount[0].count) < 10) {
        // TODO: Send keys:low WebSocket event to target user
      }
    }

    const spk = await db.query.signedPreKeys.findFirst({
      where: and(eq(schema.signedPreKeys.userId, targetUserId), eq(schema.signedPreKeys.deviceId, 1))
    });

    res.json({
      identityKey: idKey.identityKey,
      registrationId: targetUser.registrationId,
      signedPreKey: spk ? {
        keyId: spk.keyId,
        publicKey: spk.publicKey,
        signature: spk.signature
      } : null,
      oneTimePreKey,
    });
  } catch (error) {
    console.error('[Keys Fetch Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/keys/one-time ──────────────────────────────
// Upload additional one-time pre-keys when running low
router.post('/one-time', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const deviceId = req.user!.deviceId;

    const parsed = additionalPreKeysSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid pre-keys', details: parsed.error.flatten() });
    }

    const { oneTimePreKeys } = parsed.data;

    const preKeysToInsert = oneTimePreKeys.map(pk => ({
      userId,
      deviceId,
      keyId: pk.keyId,
      publicKey: pk.publicKey,
    }));
    await db.insert(schema.oneTimePreKeys).values(preKeysToInsert);

    // Return total remaining count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.oneTimePreKeys)
      .where(
        and(
          eq(schema.oneTimePreKeys.userId, userId),
          eq(schema.oneTimePreKeys.used, false)
        )
      );

    res.json({ count: Number(countResult[0]?.count || 0) });
  } catch (error) {
    console.error('[Keys Upload Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/keys/count ──────────────────────────────────
// Check how many unused OTPKs remain for the current user
router.get('/count', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.oneTimePreKeys)
      .where(
        and(
          eq(schema.oneTimePreKeys.userId, userId),
          eq(schema.oneTimePreKeys.used, false)
        )
      );

    res.json({ count: Number(countResult[0]?.count || 0) });
  } catch (error) {
    console.error('[Keys Count Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
