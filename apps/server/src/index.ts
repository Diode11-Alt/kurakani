import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/auth';
import attachmentRoutes from './routes/attachments';
import turnRoutes from './routes/turn';
import utilsRoutes from './routes/utils';
import { requireAuth } from './middleware/auth';
import { initS3 } from './lib/s3';
import { setupSignaling } from './signaling';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Setup Signaling using our dedicated module
setupSignaling(wss);

// Trust proxy if we are behind a reverse proxy (e.g. Nginx, Docker)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined')); // Production-grade structured logging

// Global Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/turn', requireAuth, turnRoutes);
app.use('/api/utils', utilsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global Error Handler
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
