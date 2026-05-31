import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import path from 'path';
import { EventEmitter } from 'events';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl || redisUrl === 'memory') {
  console.warn('[Redis] Warning: REDIS_URL not set or set to memory. Connect to a real Redis server for cross-server pub/sub.');
}

export const redis = new Redis(redisUrl || 'redis://localhost:6379');
export const pubClient = new Redis(redisUrl || 'redis://localhost:6379');
export const subClient = new Redis(redisUrl || 'redis://localhost:6379');

redis.on('error', (err) => console.error('[Redis Error]', err));
redis.on('connect', () => console.log('[Redis] Connected'));
subClient.on('error', (err) => console.error('[Redis Sub Error]', err));
pubClient.on('error', (err) => console.error('[Redis Pub Error]', err));
