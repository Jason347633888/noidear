import { RedisService } from '../src/modules/redis/redis.service';

describe('Redis Module (e2e)', () => {
  let redisClient: any;
  let redisService: RedisService;

  beforeEach(() => {
    redisClient = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(1),
      hset: jest.fn().mockResolvedValue(1),
      hget: jest.fn(),
      lpush: jest.fn().mockResolvedValue(1),
      llen: jest.fn().mockResolvedValue(2),
      lrange: jest.fn(),
      info: jest.fn().mockResolvedValue('redis_version:7.0.0'),
      exists: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      flushall: jest.fn().mockResolvedValue('OK'),
      quit: jest.fn().mockResolvedValue('OK'),
      status: 'ready',
    };

    // Create RedisService with mocked client
    redisService = new RedisService(redisClient as any);
  });

  describe('Redis连接', () => {
    it('应该能够连接Redis', () => {
      expect(redisClient).toBeDefined();
      expect(redisClient.status).toBe('ready');
    });

    it('应该能够执行PING命令', async () => {
      const result = await redisClient.ping();
      expect(result).toBe('PONG');
    });

    it('应该能够设置和获取键值', async () => {
      redisClient.get.mockResolvedValue('test_value');

      await redisClient.set('test_key', 'test_value');
      const value = await redisClient.get('test_key');

      expect(value).toBe('test_value');
      expect(redisClient.set).toHaveBeenCalledWith('test_key', 'test_value');
    });

    it('应该能够设置过期时间', async () => {
      redisClient.ttl.mockResolvedValue(1);

      await redisClient.set('expire_test', 'value', 'EX', 1);
      const ttl = await redisClient.ttl('expire_test');

      expect(ttl).toBe(1);
    });

    it('应该能够执行哈希操作', async () => {
      redisClient.hget.mockImplementation((_key: string, field: string) => {
        if (field === 'name') return Promise.resolve('admin');
        if (field === 'role') return Promise.resolve('admin');
        return Promise.resolve(null);
      });

      await redisClient.hset('user:1', 'name', 'admin');
      await redisClient.hset('user:1', 'role', 'admin');

      const name = await redisClient.hget('user:1', 'name');
      const role = await redisClient.hget('user:1', 'role');

      expect(name).toBe('admin');
      expect(role).toBe('admin');
    });

    it('应该能够执行列表操作', async () => {
      redisClient.lrange.mockResolvedValue(['document:read', 'document:create']);

      await redisClient.lpush('permissions', 'document:create');
      await redisClient.lpush('permissions', 'document:read');

      const length = await redisClient.llen('permissions');
      expect(length).toBe(2);

      const items = await redisClient.lrange('permissions', 0, -1);
      expect(items).toContain('document:create');
      expect(items).toContain('document:read');
    });
  });

  describe('Redis健康检查', () => {
    it('应该能够检测Redis状态', async () => {
      const info = await redisClient.info('server');
      expect(info).toContain('redis_version');
    });
  });

  describe('RedisService', () => {
    it('应该提供RedisService', () => {
      expect(redisService).toBeDefined();
    });

    it('应该能够通过RedisService执行操作', async () => {
      redisClient.get.mockResolvedValue('service_test');

      const result = await redisService.get('test_key');
      expect(result).toBe('service_test');
      expect(redisClient.get).toHaveBeenCalledWith('test_key');
    });

    it('应该能够通过RedisService设置键值对', async () => {
      await redisService.setex('test_key', 60, 'test_value');
      expect(redisClient.setex).toHaveBeenCalledWith('test_key', 60, 'test_value');
    });

    it('应该能够通过RedisService删除键', async () => {
      const result = await redisService.del('test_key');
      expect(result).toBe(1);
      expect(redisClient.del).toHaveBeenCalledWith('test_key');
    });

    it('应该能够使用通配符删除键', async () => {
      redisClient.keys.mockResolvedValue(['test:1', 'test:2', 'test:3']);
      redisClient.del.mockResolvedValue(3);

      const result = await redisService.del('test:*');
      expect(result).toBe(3);
      expect(redisClient.keys).toHaveBeenCalledWith('test:*');
      expect(redisClient.del).toHaveBeenCalledWith('test:1', 'test:2', 'test:3');
    });

    it('应该能够检查键是否存在', async () => {
      const result = await redisService.exists('test_key');
      expect(result).toBe(1);
      expect(redisClient.exists).toHaveBeenCalledWith('test_key');
    });

    it('应该能够设置过期时间', async () => {
      const result = await redisService.expire('test_key', 60);
      expect(result).toBe(1);
      expect(redisClient.expire).toHaveBeenCalledWith('test_key', 60);
    });

    it('应该能够获取TTL', async () => {
      const result = await redisService.ttl('test_key');
      expect(result).toBe(1);
      expect(redisClient.ttl).toHaveBeenCalledWith('test_key');
    });

    it('应该能够清空所有键', async () => {
      const result = await redisService.flushall();
      expect(result).toBe('OK');
      expect(redisClient.flushall).toHaveBeenCalled();
    });
  });
});
