import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../src/modules/redis/redis.module';
import { REDIS_CLIENT } from '../src/modules/redis/redis.module';
import Redis from 'ioredis';

describe('Redis Module (e2e)', () => {
  let module: TestingModule;
  let redisClient: Redis;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env'
        }),
        RedisModule
      ]
    }).compile();

    redisClient = module.get<Redis>(REDIS_CLIENT);
  });

  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit();
    }
    await module.close();
  });

  describe('Redis连接', () => {
    it('应该能够连接Redis', async () => {
      expect(redisClient).toBeDefined();
      // 等待连接就绪
      await redisClient.ping();
      expect(['ready', 'connecting']).toContain(redisClient.status);
    });

    it('应该能够执行PING命令', async () => {
      const result = await redisClient.ping();
      expect(result).toBe('PONG');
    });

    it('应该能够设置和获取键值', async () => {
      await redisClient.set('test_key', 'test_value');
      const value = await redisClient.get('test_key');
      expect(value).toBe('test_value');
      await redisClient.del('test_key');
    });

    it('应该能够设置过期时间', async () => {
      await redisClient.set('expire_test', 'value', 'EX', 1);
      const ttl = await redisClient.ttl('expire_test');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(1);
    });

    it('应该能够执行哈希操作', async () => {
      await redisClient.hset('user:1', 'name', 'admin');
      await redisClient.hset('user:1', 'role', 'admin');

      const name = await redisClient.hget('user:1', 'name');
      const role = await redisClient.hget('user:1', 'role');

      expect(name).toBe('admin');
      expect(role).toBe('admin');

      await redisClient.del('user:1');
    });

    it('应该能够执行列表操作', async () => {
      await redisClient.lpush('permissions', 'document:create');
      await redisClient.lpush('permissions', 'document:read');

      const length = await redisClient.llen('permissions');
      expect(length).toBe(2);

      const items = await redisClient.lrange('permissions', 0, -1);
      expect(items).toContain('document:create');
      expect(items).toContain('document:read');

      await redisClient.del('permissions');
    });
  });

  describe('Redis健康检查', () => {
    it('应该能够检测Redis状态', async () => {
      const info = await redisClient.info('server');
      expect(info).toContain('redis_version');
    });
  });
});
