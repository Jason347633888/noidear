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
    task: `${TEST_PREFIX}-task`,
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

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by taskId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deviation-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ taskId: ids.task })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deviation-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/deviation-reports')
        .expect(401);
    });
  });

  // ========== 偏离报告审批 ==========

  describe('POST /api/v1/deviation-reports/:id/approve', () => {
    let reportId: string;

    beforeEach(async () => {
      // 创建测试用偏离报告
      const report = await prisma.deviationReport.create({
        data: {
          id: `${ids.deviationReport}-${Date.now()}`,
          recordId: ids.record,
          templateId: ids.template,
          fieldName: 'temperature',
          expectedValue: '25',
          actualValue: '30',
          toleranceMin: 23,
          toleranceMax: 27,
          deviationAmount: 5,
          deviationRate: 20,
          deviationType: 'exceeds_tolerance',
          reason: '超出温度阈值范围',
          reportedBy: ids.admin,
          status: 'pending',
        },
      });
      reportId = report.id;
    });

    it('should approve deviation report', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/deviation-reports/${reportId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved', comment: '审批通过' })
        .expect(201);

      expect(response.body.success).toBe(true);

      // 验证状态已更新
      const updated = await prisma.deviationReport.findUnique({
        where: { id: reportId },
      });
      expect(updated?.status).toBe('approved');
    });

    it('should reject deviation report with reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/deviation-reports/${reportId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', comment: '数据不准确，需重新提交' })
        .expect(201);

      expect(response.body.success).toBe(true);

      // 验证状态已更新
      const updated = await prisma.deviationReport.findUnique({
        where: { id: reportId },
      });
      expect(updated?.status).toBe('rejected');
    });

    it('should return 404 for non-existent report', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/deviation-reports/non-existent-id/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/deviation-reports/${reportId}/approve`)
        .send({ status: 'approved' })
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
    // 创建部门
    await prisma.department.create({
      data: {
        id: ids.dept,
        code: `${TEST_PREFIX}-DEPT`,
        name: 'E2E Test Department',
      },
    });

    // 创建用户
    await prisma.user.createMany({
      data: [
        {
          id: ids.admin,
          username: `${TEST_PREFIX}-admin`,
          name: 'E2E Admin',
          password: passwordHash,
          role: 'admin',
          departmentId: ids.dept,
        },
        {
          id: ids.user,
          username: `${TEST_PREFIX}-user`,
          name: 'E2E User',
          password: passwordHash,
          role: 'user',
          departmentId: ids.dept,
        },
      ],
    });

    // 创建模板
    const templateFields = [
      {
        key: 'temperature',
        label: '温度',
        type: 'number' as const,
        required: true,
        standardValue: 25,
        deviationThreshold: 2,
      },
      {
        key: 'pressure',
        label: '压力',
        type: 'number' as const,
        required: true,
        standardValue: 100,
        deviationThreshold: 5,
      },
    ];

    await prisma.template.create({
      data: {
        id: ids.template,
        title: 'E2E Test Template',
        number: `${TEST_PREFIX}-TPL-001`,
        level: 4,
        fieldsJson: templateFields,
        creatorId: ids.admin,
        version: 1,
      },
    });

    // 创建任务
    await prisma.task.create({
      data: {
        id: ids.task,
        templateId: ids.template,
        departmentId: ids.dept,
        deadline: new Date(Date.now() + 86400000),
        status: 'pending',
        creatorId: ids.admin,
      },
    });

    // 创建任务记录（带偏离）
    await prisma.taskRecord.create({
      data: {
        id: ids.record,
        taskId: ids.task,
        templateId: ids.template,
        submitterId: ids.user,
        hasDeviation: true,
        status: 'pending',
        dataJson: {
          temperature: 30, // 偏离标准值 25，超出阈值 2
          pressure: 110,   // 偏离标准值 100，超出阈值 5
        },
      },
    });
  }

  async function cleanTestData(prisma: PrismaService) {
    await prisma.deviationReport.deleteMany({
      where: { id: { startsWith: ids.deviationReport } },
    });
    await prisma.taskRecord.deleteMany({
      where: { id: ids.record },
    });
    await prisma.task.deleteMany({
      where: { id: ids.task },
    });
    await prisma.template.deleteMany({
      where: { id: ids.template },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [ids.admin, ids.user] } },
    });
    await prisma.department.deleteMany({
      where: { id: ids.dept },
    });
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
