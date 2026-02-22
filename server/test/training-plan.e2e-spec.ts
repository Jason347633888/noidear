import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { loginForTest, getData } from './test-helpers';
import { REDIS_CLIENT } from '../src/modules/redis/redis.constants';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Training Plan API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;

  const TEST_USER = {
    username: process.env.TEST_USERNAME || 'admin',
    password: process.env.TEST_PASSWORD || '12345678',
  };

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
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
    await app.init();

    prisma = new PrismaClient();
    await prisma.$connect();

    // 登录获取 token
    const loginData = await loginForTest(app, TEST_USER.username, TEST_USER.password);
    authToken = loginData.token;
    userId = loginData.userId;

    // 创建培训计划审批工作流模板
    await prisma.workflowTemplate.upsert({
      where: { code: 'training-plan-approval' },
      update: {},
      create: {
        code: 'training-plan-approval',
        name: '培训计划审批',
        description: '培训计划审批工作流',
        category: 'approval',
        steps: [
          {
            stepNumber: 1,
            name: '部门审批',
            approverType: 'ROLE',
            approverIds: ['dept_manager'],
            allowReject: true,
          },
        ],
        status: 'active',
        version: 1,
      },
    });
  });

  afterAll(async () => {
    // 清理测试数据（按依赖顺序）
    await prisma.workflowInstance.deleteMany({ where: { resourceType: 'training_plan' } });
    await prisma.trainingProject.deleteMany({ where: { title: { contains: 'E2E测试' } } });
    await prisma.trainingPlan.deleteMany({ where: { year: { gte: 2025 } } });
    await prisma.workflowTemplate.deleteMany({ where: { code: 'training-plan-approval' } });
    await prisma.$disconnect();
    await app.close();
  });

  describe('TASK-304: 培训计划 CRUD API', () => {
    let planId: string;

    describe('POST /api/v1/training/plans - 创建培训计划', () => {
      it('BR-091: 应该成功创建培训计划', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/training/plans')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            year: 2025,
            title: '2025年度培训计划',
          })
          .expect(201);

        const data = getData(res.body);
        expect(data.year).toBe(2025);
        expect(data.title).toBe('2025年度培训计划');
        expect(data.status).toBe('draft');
        expect(data.createdBy).toBe(userId);

        planId = data.id;
      });

      it('BR-091: 年度唯一性 - 重复年度应该失败', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/training/plans')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            year: 2025,
            title: '另一个2025年计划',
          })
          .expect(409); // Conflict
      });

      it('应该验证必填字段', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/training/plans')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);
      });

      it('应该要求登录', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/training/plans')
          .send({
            year: 2026,
            title: '2026年计划',
          })
          .expect(401);
      });
    });

    describe('GET /api/v1/training/plans - 查询培训计划列表', () => {
      it('应该返回培训计划列表', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/training/plans')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        const data = getData(res.body);
        expect(data.items).toBeDefined();
        expect(Array.isArray(data.items)).toBe(true);
        expect(data.total).toBeGreaterThan(0);
        expect(data.page).toBe(1);
        expect(data.limit).toBe(10);
      });

      it('应该支持年度筛选', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/training/plans')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ year: 2025, page: 1, limit: 10 })
          .expect(200);

        const data = getData(res.body);
        expect(data.items.every((p: any) => p.year === 2025)).toBe(true);
      });

      it('应该支持状态筛选', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/training/plans')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ status: 'draft', page: 1, limit: 10 })
          .expect(200);

        const data = getData(res.body);
        expect(data.items.every((p: any) => p.status === 'draft')).toBe(true);
      });
    });

    describe('GET /api/v1/training/plans/:id - 查询计划详情', () => {
      it('应该返回计划详情', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/training/plans/${planId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const data = getData(res.body);
        expect(data.id).toBe(planId);
        expect(data.year).toBe(2025);
        expect(data.projects).toBeDefined();
      });

      it('计划不存在应该返回 404', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/training/plans/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('PUT /api/v1/training/plans/:id - 更新培训计划', () => {
      it('BR-093: 应该成功更新草稿状态的计划', async () => {
        const res = await request(app.getHttpServer())
          .put(`/api/v1/training/plans/${planId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '2025年度培训计划（已更新）',
          })
          .expect(200);

        const data = getData(res.body);
        expect(data.title).toBe('2025年度培训计划（已更新）');
      });

      it('BR-093: 非草稿状态不能修改', async () => {
        // 先提交审批
        await prisma.trainingPlan.update({
          where: { id: planId },
          data: { status: 'approved' },
        });

        await request(app.getHttpServer())
          .put(`/api/v1/training/plans/${planId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: '不应该成功',
          })
          .expect(400);

        // 恢复草稿状态
        await prisma.trainingPlan.update({
          where: { id: planId },
          data: { status: 'draft' },
        });
      });
    });

    describe('POST /api/v1/training/plans/:id/submit - 提交审批', () => {
      it('BR-092: 应该成功提交审批', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/training/plans/${planId}/submit`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        const data = getData(res.body);
        expect(data.status).toBe('pending_approval');
      });

      it('非草稿状态不能提交审批', async () => {
        await request(app.getHttpServer())
          .post(`/api/v1/training/plans/${planId}/submit`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // 恢复草稿状态
        await prisma.trainingPlan.update({
          where: { id: planId },
          data: { status: 'draft' },
        });
      });
    });

    describe('DELETE /api/v1/training/plans/:id - 删除培训计划', () => {
      it('BR-093: 有项目的计划不能删除', async () => {
        // 创建一个项目
        const project = await prisma.trainingProject.create({
          data: {
            planId,
            title: 'E2E测试项目',
            department: 'QA',
            quarter: 1,
            trainerId: userId,
            trainees: [userId],
            status: 'planned',
          },
        });

        await request(app.getHttpServer())
          .delete(`/api/v1/training/plans/${planId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // 清理项目
        await prisma.trainingProject.delete({ where: { id: project.id } });
      });

      it('BR-093: 应该成功删除草稿状态的空计划', async () => {
        // 创建一个新计划用于删除
        const tempPlan = await prisma.trainingPlan.create({
          data: {
            year: 2099,
            title: '临时计划',
            status: 'draft',
            createdBy: userId,
          },
        });

        await request(app.getHttpServer())
          .delete(`/api/v1/training/plans/${tempPlan.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // 验证已删除
        const deleted = await prisma.trainingPlan.findUnique({
          where: { id: tempPlan.id },
        });
        expect(deleted).toBeNull();
      });

      it('BR-093: 非草稿状态不能删除', async () => {
        await prisma.trainingPlan.update({
          where: { id: planId },
          data: { status: 'approved' },
        });

        await request(app.getHttpServer())
          .delete(`/api/v1/training/plans/${planId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // 恢复草稿状态
        await prisma.trainingPlan.update({
          where: { id: planId },
          data: { status: 'draft' },
        });
      });
    });
  });
});
