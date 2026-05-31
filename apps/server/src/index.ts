import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import RedisStore from 'rate-limit-redis';
import { redis } from './lib/redis';
import authRoutes from './routes/auth';
import keysRoutes from './routes/keys';
import messageRoutes from './routes/messages';
import attachmentRoutes from './routes/attachments';
import turnRoutes from './routes/turn';
import usersRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import utilsRoutes from './routes/utils';
import groupRoutes from './routes/groups';
import { requireAuth } from './middleware/auth';
import { initS3 } from './lib/s3';
import { setupSignaling } from './signaling';
import cron from 'node-cron';
import { db, schema } from '@signal/db';
import { lt } from 'drizzle-orm';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ─── Disappearing Messages Cron ───────────────────────────
cron.schedule('* * * * *', async () => {
  try {
    const result = await db.delete(schema.messages)
      .where(lt(schema.messages.expiresAt, new Date()));
    if (result.count > 0) {
      console.log(`[Cron] Deleted ${result.count} expired messages`);
    }
  } catch (err) {
    console.error('[Cron] Error deleting expired messages:', err);
  }
});

// ─── Validate critical env vars ───────────────────────────
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[FATAL] Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const httpServer = createServer(app);

// Setup Signaling using our dedicated module
setupSignaling(httpServer);

// Trust proxy if we are behind a reverse proxy (e.g. Nginx, Docker)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(morgan('combined')); // Production-grade structured logging

// Global Rate Limiting
const isMemoryRedis = !process.env.REDIS_URL || process.env.REDIS_URL === 'memory';

const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  standardHeaders: true,
  legacyHeaders: false,
  ...(isMemoryRedis ? {} : {
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
    })
  }),
});
app.use('/api/', apiLimiter);

// Auth-specific rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' },
  ...(isMemoryRedis ? {} : {
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as any,
    })
  }),
});

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/keys', requireAuth, keysRoutes);
app.use('/api/messages', requireAuth, messageRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/turn', requireAuth, turnRoutes);
app.use('/api/users', requireAuth, usersRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/groups', requireAuth, groupRoutes);
app.use('/api/utils', utilsRoutes);

// ─── Health Check ─────────────────────────────────────────
app.get('/health', async (req, res) => {
  const status: Record<string, string> = { status: 'ok' };

  // Check database
  try {
    const { db } = await import('@signal/db');
    await db.execute(require('drizzle-orm').sql`SELECT 1`);
    status.database = 'connected';
  } catch {
    status.database = 'error';
    status.status = 'degraded';
  }

  // Check Redis
  try {
    const { redis } = await import('./lib/redis');
    await redis.ping();
    status.redis = 'connected';
  } catch {
    status.redis = 'error';
    status.status = 'degraded';
  }

  const httpStatus = status.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(status);
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Handler]', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    // Never leak stack traces to client in production
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await initS3();
  } catch (err) {
    console.error('Failed to init S3', err);
  }
});
