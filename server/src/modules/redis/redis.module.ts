import { Module, Global, OnModuleDestroy, DynamicModule } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';

// 创建一个基础的 mock Redis client 供测试使用
const createMockRedisClient = () => ({
  get: () => Promise.resolve(null),
  setex: () => Promise.resolve('OK'),
  del: () => Promise.resolve(1),
  exists: () => Promise.resolve(0),
  expire: () => Promise.resolve(1),
  ttl: () => Promise.resolve(-1),
  flushall: () => Promise.resolve('OK'),
  keys: () => Promise.resolve([]),
  quit: () => Promise.resolve('OK'),
  ping: () => Promise.resolve('PONG'),
  status: 'ready',
  on: () => {},
  once: () => {},
  emit: () => {},
  removeListener: () => {},
});

@Global()
@Module({})
export class RedisModule implements OnModuleDestroy {
  static forTest(): DynamicModule {
    const mockRedisClient = createMockRedisClient();
    const mockRedisService = new RedisService(mockRedisClient as any);

    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
      exports: [REDIS_CLIENT, RedisService],
      global: true,
    };
  }
  constructor(private readonly moduleRef: ModuleRef) {}

  static forRoot(): DynamicModule {
    // 在测试环境中直接返回 forTest()
    if (process.env.NODE_ENV === 'test') {
      return RedisModule.forTest();
    }

    return {
      module: RedisModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS_CLIENT,
          useFactory: (configService: ConfigService) => {
            const redisUrl = configService.get('REDIS_URL');

            if (redisUrl) {
              // 使用REDIS_URL连接
              return new Redis(redisUrl, {
                retryStrategy: (times) => {
                  const delay = Math.min(times * 50, 2000);
                  return delay;
                },
                maxRetriesPerRequest: 3
              });
            } else {
              // 使用单独配置
              return new Redis({
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD'),
                db: configService.get('REDIS_DB', 0),
                retryStrategy: (times) => {
                  const delay = Math.min(times * 50, 2000);
                  return delay;
                },
                maxRetriesPerRequest: 3
              });
            }
          },
          inject: [ConfigService]
        },
        RedisService
      ],
      exports: [REDIS_CLIENT, RedisService],
      global: true,
    };
  }

  async onModuleDestroy() {
    const redisClient = this.moduleRef.get<Redis>(REDIS_CLIENT, { strict: false });
    if (redisClient) {
      try {
        if (redisClient.status !== 'end') {
          await redisClient.quit();
        }
      } catch (error) {
        // Ignore errors if connection already closed
      }
    }
  }
}
