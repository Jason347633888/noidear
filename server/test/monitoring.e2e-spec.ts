import { loginForTest, getData } from "./test-helpers";
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../src/modules/redis/redis.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const TEST_PREFIX = `e2e-mon-${Date.now()}`;
const IDS = {
  admin: `${TEST_PREFIX}-admin`,
  dept: `${TEST_PREFIX}-dept`,
};

describe.skip('Monitoring API (e2e) - Unimplemented Feature', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(-1),
      flushall: jest.fn().mockResolvedValue('OK'),
      keys: jest.fn().mockResolvedValue([]),
      quit: jest.fn().mockResolvedValue('OK'),
      status: 'ready',
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(mockRedisClient)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user
    const hash = await bcrypt.hash('test123456', 10);
    await prisma.department.create({
      data: { id: IDS.dept, code: `${TEST_PREFIX}-cd`, name: 'MonTestDept', status: 'active' },
    });
    await prisma.user.create({
      data: { id: IDS.admin, username: `${TEST_PREFIX}-admin`, password: hash, name: 'MonAdmin', role: 'admin', departmentId: IDS.dept, status: 'active' },
    });

    // Login to get token
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: `${TEST_PREFIX}-admin`, password: 'test123456' });
    authToken = getData(adminRes.body)?.token;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.systemMetric.deleteMany({
      where: { metricName: { contains: 'test' } },
    });
    await prisma.user.deleteMany({ where: { id: IDS.admin } });
    await prisma.department.deleteMany({ where: { id: IDS.dept } });

    await app.close();
  });

  describe('GET /api/v1/monitoring/metrics', () => {
    it('should get Prometheus format metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });
  });

  describe('POST /api/v1/monitoring/metrics', () => {
    it('should record a metric successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metricName: 'test_metric_1',
          metricValue: 100,
          metricType: 'system',
          tags: '{"host":"localhost"}',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.metricName).toBe('test_metric_1');
      expect(response.body.metricValue).toBe(100);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics')
        .send({
          metricName: 'test_metric_2',
          metricValue: 200,
          metricType: 'application',
        })
        .expect(401);
    });

    it('should fail with invalid metric type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metricName: 'test_metric_3',
          metricValue: 300,
          metricType: 'invalid_type',
        })
        .expect(400);
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metricName: 'test_metric_4',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/monitoring/metrics/query', () => {
    it('should query metrics with pagination', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total');
    });

    it('should filter metrics by metricName', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ metricName: 'test_metric_1', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter metrics by metricType', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ metricType: 'system', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter metrics by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ startDate, endDate, page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/monitoring/metrics/stats', () => {
    it('should get metric statistics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/monitoring/metrics/stats?metricName=test_metric_1&startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('min');
      expect(response.body).toHaveProperty('max');
      expect(response.body).toHaveProperty('avg');
      expect(response.body).toHaveProperty('sum');
    });
  });

  describe('POST /api/v1/monitoring/metrics/cleanup', () => {
    it('should cleanup old metrics', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
    });
  });
});
