import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is missing');
}

export const redis = new Redis(redisUrl);

redis.on('error', (err) => {
  console.error('[Redis Error]', err);
});
redis.on('connect', () => {
  console.log('[Redis] Connected');
});
