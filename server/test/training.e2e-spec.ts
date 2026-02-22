import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { REDIS_CLIENT } from '../src/modules/redis/redis.constants';
import {
  TEST_PREFIX, IDS, planIds, projectIds, questionIds,
  getData, seedDept, seedUsers, doLogin,
  apiCreatePlan, apiCreateProject, apiCreateQuestion,
  cleanTodos, cleanExams, cleanRecords, cleanArchives,
  cleanProjects, cleanPlans, cleanUsers, cleanDept,
} from './training-test-helpers';

describe('Training System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let trainerToken: string;
  let trainee1Token: string;

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
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Clean up any existing test data before starting
    await prisma.trainingPlan.deleteMany({
      where: { year: { in: [2025, 2026, 2027, 2028, 2029] } },
    });
    await prisma.todoTask.deleteMany({
      where: {
        OR: [
          { title: { contains: TEST_PREFIX } },
          { relatedId: { contains: TEST_PREFIX } },
        ],
      },
    });

    const hash = await bcrypt.hash('test123456', 10);
    await seedDept(prisma);
    await seedUsers(prisma, hash);

    adminToken = await doLogin(app, `${TEST_PREFIX}-admin`, 'test123456');
    trainerToken = await doLogin(app, `${TEST_PREFIX}-trainer`, 'test123456');
    trainee1Token = await doLogin(app, `${TEST_PREFIX}-trainee1`, 'test123456');
  }, 30000);

  afterAll(async () => {
    await cleanTodos(prisma);
    await cleanExams(prisma);
    await cleanRecords(prisma);
    await cleanArchives(prisma);
    await cleanProjects(prisma);
    await cleanPlans(prisma);
    // Clean up any documents created by test users
    await prisma.document.deleteMany({
      where: { creatorId: { in: [IDS.admin, IDS.trainer, IDS.trainee1, IDS.trainee2] } },
    });
    await cleanUsers(prisma);
    await cleanDept(prisma);
    await app.close();
  }, 30000);

  describe('Training Plan API', () => {
    it('BR-091: should create plan with unique year', async () => {
      const { response, data } = await apiCreatePlan(app, adminToken, 2025, '2025计划');
      expect(response.status).toBe(201);
      expect(data.year).toBe(2025);
      expect(data.status).toBe('draft');
    });

    it('BR-091: should reject duplicate year', async () => {
      const { response } = await apiCreatePlan(app, adminToken, 2025, '重复');
      expect(response.status).toBe(409);
    });

    it('should list plans with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/training/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);
      expect(getData(res.body).items).toBeDefined();
    });
  });

  describe('Training Project API', () => {
    let planId: string;

    beforeAll(async () => {
      const { data } = await apiCreatePlan(app, adminToken, 2026, '2026计划');
      planId = data.id;
    });

    it('should create project', async () => {
      const { response, data } = await apiCreateProject(app, adminToken, planId);
      expect(response.status).toBe(201);
      expect(data.planId).toBe(planId);
      expect(data.status).toBe('planned');
    });

    it('BR-108: should auto-create todo tasks', async () => {
      const { data: project } = await apiCreateProject(app, adminToken, planId);
      const todos = await prisma.todoTask.findMany({
        where: { relatedId: project.id },
      });
      expect(todos.length).toBeGreaterThan(0);
      expect(todos.some(t => t.type === 'training_attend')).toBe(true);
    });

    it('BR-108: should auto-create learning records', async () => {
      const { data: project } = await apiCreateProject(app, adminToken, planId);
      const records = await prisma.learningRecord.findMany({
        where: { projectId: project.id },
      });
      expect(records.length).toBe(2);
    });
  });

  describe('Exam Workflow', () => {
    let planId: string;
    let projectId: string;
    let q1Id: string;
    let q2Id: string;

    beforeAll(async () => {
      const { data: plan } = await apiCreatePlan(app, adminToken, 2027, '2027计划');
      planId = plan.id;
      const { data: project } = await apiCreateProject(app, adminToken, planId);
      projectId = project.id;

      const { data: q1 } = await apiCreateQuestion(app, adminToken, projectId, {
        content: 'Q1',
        points: 50,
      });
      q1Id = q1.id;

      const { data: q2 } = await apiCreateQuestion(app, adminToken, projectId, {
        content: 'Q2',
        points: 50,
      });
      q2Id = q2.id;
    });

    it('should start exam', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/training/exam/start')
        .set('Authorization', `Bearer ${trainee1Token}`)
        .send({ projectId })
        .expect(201);
      const data = getData(res.body);
      expect(data.questions).toHaveLength(2);
      expect(data.questions[0].correctAnswer).toBeUndefined();
    });

    it('BR-106: should auto-grade exam', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/training/exam/submit')
        .set('Authorization', `Bearer ${trainee1Token}`)
        .send({
          projectId,
          answers: {
            [q1Id]: 'A',
            [q2Id]: 'A',
          },
        })
        .expect(201);
      const data = getData(res.body);
      expect(data.score).toBe(100);
      expect(data.passed).toBe(true);
    });

    it('BR-106: should auto-complete todo', async () => {
      const todos = await prisma.todoTask.findMany({
        where: {
          relatedId: projectId,
          type: 'training_attend',
          userId: IDS.trainee1,
        },
      });
      expect(todos[0].status).toBe('completed');
    });

    it('BR-105: should enforce max attempts', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/training/exam/start')
        .set('Authorization', `Bearer ${trainee1Token}`)
        .send({ projectId })
        .expect(400);
    });
  });

  describe('Question Management API', () => {
    let planId: string;
    let projectId: string;
    let questionId: string;

    beforeAll(async () => {
      const { data: plan } = await apiCreatePlan(app, adminToken, 2028, '2028计划');
      planId = plan.id;
      const { data: project } = await apiCreateProject(app, adminToken, planId);
      projectId = project.id;
    });

    it('should create question', async () => {
      const { response, data } = await apiCreateQuestion(app, adminToken, projectId, {
        content: '考试题目1',
        points: 50,
      });
      expect(response.status).toBe(201);
      questionId = data?.id;
      expect(data?.content).toBe('考试题目1');
      expect(data?.points).toBe(50);
    });

    it('should list questions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/training/questions')
        .query({ projectId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = getData(res.body);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should update question order', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/training/questions/update-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId,
          questionOrders: [{ id: questionId, order: 2 }],
        })
        .expect(200);
    });

    it('should batch import questions', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/training/questions/batch-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId,
          questions: [
            {
              type: 'choice',
              content: '批量题目1',
              options: { A: 'A', B: 'B' },
              correctAnswer: 'A',
              points: 25,
            },
            {
              type: 'choice',
              content: '批量题目2',
              options: { A: 'A', B: 'B' },
              correctAnswer: 'B',
              points: 25,
            },
          ],
        })
        .expect(201);
      const data = getData(res.body);
      expect(data.count).toBe(2);
    });
  });

  describe('Archive Generation API', () => {
    let planId: string;
    let projectId: string;

    beforeAll(async () => {
      const { data: plan } = await apiCreatePlan(app, adminToken, 2029, '2029计划');
      planId = plan.id;
      const { data: project } = await apiCreateProject(app, adminToken, planId);
      projectId = project.id;

      await apiCreateQuestion(app, adminToken, projectId, {
        content: 'Q1',
        points: 50,
      });
      await apiCreateQuestion(app, adminToken, projectId, {
        content: 'Q2',
        points: 50,
      });
    });

    it('BR-112: should generate archive after project completed', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/training/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ongoing' })
        .expect(200);

      await request(app.getHttpServer())
        .put(`/api/v1/training/projects/${projectId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/training/archive/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const data = getData(res.body);
      expect(data.projectId).toBe(projectId);
      expect(data.pdfPath).toBeDefined();
    });

    it('BR-114: should reject duplicate archive', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/training/archive/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    it('should list archives', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/training/archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = getData(res.body);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Todo Task API', () => {
    it('should list user todos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/todos')
        .set('Authorization', `Bearer ${trainee1Token}`)
        .expect(200);
      const data = getData(res.body);
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.total).toBeDefined();
    });

    it('BR-111: should get todo statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/todos/statistics')
        .set('Authorization', `Bearer ${trainee1Token}`)
        .expect(200);
      const data = getData(res.body);
      expect(data.total).toBeDefined();
      expect(data.byType).toBeDefined();
    });

    it('should complete todo', async () => {
      const todos = await prisma.todoTask.findFirst({
        where: { userId: IDS.trainee1, status: 'pending' },
      });

      if (todos) {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/todos/${todos.id}/complete`)
          .set('Authorization', `Bearer ${trainee1Token}`)
          .expect(200);

        const data = getData(res.body);
        expect(data.status).toBe('completed');
        expect(data.completedAt).toBeDefined();
      }
    });
  });
});
