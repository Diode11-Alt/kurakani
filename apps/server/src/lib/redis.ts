import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const redisUrl = process.env.REDIS_URL;

let RedisClient = Redis;
if (!redisUrl || redisUrl === 'memory') {
  console.warn('[Redis] Using ioredis-mock (in-memory) because REDIS_URL is not set or set to memory. Connect to a real Redis server for cross-server pub/sub.');
  RedisClient = RedisMock as any;
}

export const redis = new RedisClient(redisUrl === 'memory' ? undefined : redisUrl || 'redis://localhost:6379');
export const pubClient = new RedisClient(redisUrl === 'memory' ? undefined : redisUrl || 'redis://localhost:6379');
export const subClient = new RedisClient(redisUrl === 'memory' ? undefined : redisUrl || 'redis://localhost:6379');

redis.on('error', (err: any) => console.error('[Redis Error]', err));
redis.on('connect', () => console.log('[Redis] Connected'));
subClient.on('error', (err: any) => console.error('[Redis Sub Error]', err));
pubClient.on('error', (err: any) => console.error('[Redis Pub Error]', err));
