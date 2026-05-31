import { Router } from 'express';
import { db, schema } from '@signal/db';
import { eq, ilike, and, ne } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { updateProfileSchema } from '../lib/validation';

const router = Router();

// ─── GET /api/users/me ────────────────────────────────────
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      email: user.email,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
    });
  } catch (error) {
    console.error('[Get Profile Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/users/me ────────────────────────────────────
router.put('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const updates: Record<string, any> = {};
    if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
    if (parsed.data.username !== undefined) {
      // Check username uniqueness
      const existing = await db.query.users.findFirst({
        where: and(
          eq(schema.users.username, parsed.data.username),
          ne(schema.users.id, userId)
        ),
      });
      if (existing) return res.status(409).json({ error: 'Username already taken' });
      updates.username = parsed.data.username;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const [updated] = await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))
      .returning();

    res.json({
      userId: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      bio: updated.bio,
    });
  } catch (error) {
    console.error('[Update Profile Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/users/search ────────────────────────────────
router.get('/search', requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const userId = req.user!.userId;

    const users = await db.select({
      userId: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
    })
      .from(schema.users)
      .where(and(
        ilike(schema.users.username, `%${q}%`),
        ne(schema.users.id, userId), // Exclude self
        eq(schema.users.isActive, true),
      ))
      .limit(20);

    res.json({ users });
  } catch (error) {
    console.error('[User Search Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/users/me ─────────────────────────────────
// Delete account with 30-day grace period
router.delete('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.update(schema.users)
      .set({
        isActive: false,
        deletionScheduledAt: deletionDate,
      })
      .where(eq(schema.users.id, userId));

    // Invalidate all sessions
    await db.delete(schema.sessions)
      .where(eq(schema.sessions.userId, userId));

    res.json({
      scheduledDeletionAt: deletionDate.toISOString(),
      message: 'Your account will be deleted in 30 days. Log in to cancel.',
    });
  } catch (error) {
    console.error('[Delete Account Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
