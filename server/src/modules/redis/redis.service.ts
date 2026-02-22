import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, seconds, value);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.some(k => k.includes('*'))) {
      const pattern = keys.find(k => k.includes('*'));
      if (pattern) {
        const matchingKeys = await this.client.keys(pattern);
        if (matchingKeys.length > 0) {
          return this.client.del(...matchingKeys);
        }
      }
      return 0;
    }
    return this.client.del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    return this.client.exists(...keys);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async flushall(): Promise<'OK'> {
    return this.client.flushall();
  }
}
