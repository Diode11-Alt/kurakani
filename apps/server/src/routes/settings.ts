import { Router } from 'express';
import { db, schema } from '@signal/db';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { privacySettingsSchema, notificationSettingsSchema } from '../lib/validation';

const router = Router();

// Helper: ensure settings row exists (upsert pattern)
async function ensureSettings(userId: string) {
  const existing = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  });

  if (!existing) {
    await db.insert(schema.userSettings).values({ userId });
  }
}

// ─── GET /api/settings/privacy ────────────────────────────
router.get('/privacy', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    await ensureSettings(userId);

    const settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, userId),
    });

    res.json({
      lastSeen: settings!.lastSeen,
      readReceipts: settings!.readReceipts,
      profilePhotoVisibility: settings!.profilePhotoVisibility,
    });
  } catch (error) {
    console.error('[Privacy Settings Get Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/settings/privacy ────────────────────────────
router.put('/privacy', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const parsed = privacySettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid settings', details: parsed.error.flatten() });
    }

    await ensureSettings(userId);

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.lastSeen !== undefined) updates.lastSeen = parsed.data.lastSeen;
    if (parsed.data.readReceipts !== undefined) updates.readReceipts = parsed.data.readReceipts;
    if (parsed.data.profilePhotoVisibility !== undefined) updates.profilePhotoVisibility = parsed.data.profilePhotoVisibility;

    await db.update(schema.userSettings)
      .set(updates)
      .where(eq(schema.userSettings.userId, userId));

    res.json({ success: true });
  } catch (error) {
    console.error('[Privacy Settings Update Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/settings/notifications ──────────────────────
router.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    await ensureSettings(userId);

    const settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, userId),
    });

    res.json({
      pushNotifications: settings!.pushNotifications,
      notificationPreview: settings!.notificationPreview,
    });
  } catch (error) {
    console.error('[Notification Settings Get Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/settings/notifications ──────────────────────
router.put('/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const parsed = notificationSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid settings', details: parsed.error.flatten() });
    }

    await ensureSettings(userId);

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.pushNotifications !== undefined) updates.pushNotifications = parsed.data.pushNotifications;
    if (parsed.data.notificationPreview !== undefined) updates.notificationPreview = parsed.data.notificationPreview;

    await db.update(schema.userSettings)
      .set(updates)
      .where(eq(schema.userSettings.userId, userId));

    res.json({ success: true });
  } catch (error) {
    console.error('[Notification Settings Update Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
