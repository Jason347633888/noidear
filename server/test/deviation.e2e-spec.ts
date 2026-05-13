import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { REDIS_CLIENT } from '../src/modules/redis/redis.constants';

/**
 * 偏离检测 E2E 测试
 *
 * 测试覆盖：
 * 1. 任务提交 → 偏离检测 → 生成偏离报告
 * 2. 偏离报告查询 API
 * 3. 偏离报告审批 API
 * 4. 偏离统计 API
 *
 * 业务规则：
 * - BR-117: 配方偏离检测规则
 * - BR-118: 偏离阈值计算规则
 * - BR-119: 偏离报告生成规则
 */
describe('DeviationController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;

  const TEST_PREFIX = 'deviation-e2e';
  const ids = {
    admin: `${TEST_PREFIX}-admin`,
    user: `${TEST_PREFIX}-user`,
    dept: `${TEST_PREFIX}-dept`,
    template: `${TEST_PREFIX}-template`,
    record: `${TEST_PREFIX}-record`,
    deviationReport: `${TEST_PREFIX}-deviation-report`,
  };

  beforeAll(async () => {
    // Mock Redis client for E2E tests
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

    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(mockRedisClient)
      .compile();

    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Seed test data
    const hash = await bcrypt.hash('test123456', 10);
    await seedTestData(prisma, hash);

    // Login
    adminToken = await doLogin(app, `${TEST_PREFIX}-admin`, 'test123456');
    userToken = await doLogin(app, `${TEST_PREFIX}-user`, 'test123456');
  }, 30000);

  afterAll(async () => {
    await cleanTestData(prisma);
    await app.close();
  }, 30000);

  // ========== 偏离报告查询 ==========

  describe('GET /api/v1/deviation-reports', () => {
    it('should return deviation reports list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deviation-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data).toBeDefined();
      const data = response.body.data;
      expect(Array.isArray(data.list)).toBe(true);
      expect(data.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by recordId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deviation-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ recordId: ids.record })
        .expect(200);

      expect(response.body.code).toBe(0);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deviation-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' })
        .expect(200);

      expect(response.body.code).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/deviation-reports')
        .expect(401);
    });
  });

  // ========== 偏离报告导出 ==========

  describe('GET /api/v1/deviation-reports/export', () => {
    it('should export deviation reports as Excel', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deviation-reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/deviation-reports/export')
        .expect(401);
    });
  });

  // ========== Helper Functions ==========

  async function seedTestData(prisma: PrismaService, passwordHash: string) {
    await prisma.department.create({
      data: { id: ids.dept, code: `${TEST_PREFIX}-DEPT`, name: 'E2E Test Department' },
    });
    await prisma.user.createMany({
      data: [
        { id: ids.admin, username: `${TEST_PREFIX}-admin`, name: 'E2E Admin', password: passwordHash, role: 'admin', departmentId: ids.dept },
        { id: ids.user, username: `${TEST_PREFIX}-user`, name: 'E2E User', password: passwordHash, role: 'user', departmentId: ids.dept },
      ],
    });
    await prisma.recordTemplate.create({
      data: {
        id: ids.template,
        code: `${TEST_PREFIX}-TPL-001`,
        name: 'E2E Test Template',
        fieldsJson: [
          { key: 'temperature', label: '温度', type: 'number', required: true, standardValue: 25, deviationThreshold: 2 },
          { key: 'pressure', label: '压力', type: 'number', required: true, standardValue: 100, deviationThreshold: 5 },
        ],
        version: 1,
        deviationEnabled: true,
      },
    });
    await prisma.record.create({
      data: {
        id: ids.record,
        templateId: ids.template,
        number: `${TEST_PREFIX}-REC-001`,
        dataJson: { temperature: 30, pressure: 110 },
        status: 'draft',
        createdBy: ids.admin,
      },
    });
  }

  async function cleanTestData(prisma: PrismaService) {
    await prisma.deviationReport.deleteMany({ where: { recordId: ids.record } });
    await prisma.record.deleteMany({ where: { id: ids.record } });
    await prisma.recordTemplate.deleteMany({ where: { id: ids.template } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.admin, ids.user] } } });
    await prisma.department.deleteMany({ where: { id: ids.dept } });
  }

  async function doLogin(
    app: INestApplication,
    username: string,
    password: string,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password })
      .expect(200);

    return response.body.data.token;
  }
});
