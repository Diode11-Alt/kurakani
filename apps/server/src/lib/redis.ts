import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import path from 'path';
import { EventEmitter } from 'events';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const redisUrl = process.env.REDIS_URL;

class MockRedis extends EventEmitter {
  private store = new Map<string, string>();
  private lists = new Map<string, string[]>();
  private expiries = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    setTimeout(() => {
      console.log('[Redis] Mock connected (in-memory)');
      this.emit('connect');
    }, 100);
  }

  async set(key: string, value: string, ...args: any[]) {
    // Clear existing expiry
    if (this.expiries.has(key)) {
      clearTimeout(this.expiries.get(key)!);
      this.expiries.delete(key);
    }

    this.store.set(key, value);

    // Check for 'EX' or 'PX'
    const exIndex = args.indexOf('EX');
    if (exIndex !== -1 && args[exIndex + 1]) {
      const ttlSeconds = parseInt(args[exIndex + 1], 10);
      const timer = setTimeout(() => {
        this.store.delete(key);
        this.expiries.delete(key);
      }, ttlSeconds * 1000);
      this.expiries.set(key, timer);
    }
    return 'OK';
  }

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async del(...keys: string[]) {
    let deletedCount = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deletedCount++;
      if (this.lists.delete(key)) deletedCount++;
      if (this.expiries.has(key)) {
        clearTimeout(this.expiries.get(key)!);
        this.expiries.delete(key);
      }
    }
    return deletedCount;
  }

  async lpush(key: string, value: string) {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    this.lists.get(key)!.unshift(value);
    return this.lists.get(key)!.length;
  }

  async lrange(key: string, start: number, end: number) {
    const list = this.lists.get(key) || [];
    const stop = end === -1 ? list.length : end + 1;
    return list.slice(start, stop);
  }

  async ping() {
    return 'PONG';
  }

  async keys(pattern: string) {
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched: string[] = [];
    for (const key of this.store.keys()) {
      if (regexPattern.test(key)) {
        matched.push(key);
      }
    }
    for (const key of this.lists.keys()) {
      if (regexPattern.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }
}

export const redis = redisUrl === 'memory' 
  ? (new MockRedis() as unknown as Redis) 
  : (() => {
      const client = new Redis(redisUrl!);
      client.on('error', (err) => {
        console.error('[Redis Error]', err);
      });
      client.on('connect', () => {
        console.log('[Redis] Connected');
      });
      return client;
    })();
