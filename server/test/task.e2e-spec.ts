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
  TEST_PREFIX, IDS, FUTURE_DL, taskIds, recordIds,
  getData, seedDepts, seedUsers, seedTemplates,
  cleanDeviations, cleanRecords, cleanTasks,
  cleanNotifications, cleanTemplates, cleanUsers, cleanDepts,
  doLogin, apiCreateTask, apiCancelTask, apiSubmitTask,
} from './task-test-helpers';

describe('TaskController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let leaderToken: string;
  let memberToken: string;
  let otherToken: string;

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
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, transform: true, forbidNonWhitelisted: true,
    }));
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    const hash = await bcrypt.hash('test123456', 10);
    await seedDepts(prisma);
    await seedUsers(prisma, hash);
    await seedTemplates(prisma);

    adminToken = await doLogin(app, `${TEST_PREFIX}-admin`, 'test123456');
    leaderToken = await doLogin(app, `${TEST_PREFIX}-leader`, 'test123456');
    memberToken = await doLogin(app, `${TEST_PREFIX}-member`, 'test123456');
    otherToken = await doLogin(app, `${TEST_PREFIX}-other`, 'test123456');
  }, 30000);

  afterAll(async () => {
    await cleanDeviations(prisma);
    await cleanRecords(prisma);
    await cleanTasks(prisma);
    await cleanNotifications(prisma);
    await cleanTemplates(prisma);
    await cleanUsers(prisma);
    await cleanDepts(prisma);
    await app.close();
  }, 30000);

  // 1. POST /api/v1/tasks
  describe('POST /tasks', () => {
    it('should create task with valid data', async () => {
      const { response, data } = await apiCreateTask(app, adminToken);
      expect(response.status).toBe(201);
      expect(data.templateId).toBe(IDS.tmpl);
      expect(data.departmentId).toBe(IDS.dept);
      expect(data.status).toBe('pending');
      expect(data.creatorId).toBe(IDS.admin);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .send({ templateId: IDS.tmpl, departmentId: IDS.dept, deadline: FUTURE_DL })
        .expect(401);
    });

    it('should 404 for non-existent template', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: 'no-tmpl', departmentId: IDS.dept, deadline: FUTURE_DL })
        .expect(404);
    });

    it('should reject inactive template (BR-005)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: IDS.tmplInactive, departmentId: IDS.dept, deadline: FUTURE_DL })
        .expect(400);
    });

    it('should validate missing templateId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .send({ departmentId: IDS.dept, deadline: FUTURE_DL })
        .expect(400);
    });

    it('should validate missing departmentId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: IDS.tmpl, deadline: FUTURE_DL })
        .expect(400);
    });

    it('should validate missing deadline', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: IDS.tmpl, departmentId: IDS.dept })
        .expect(400);
    });

    it('should validate invalid deadline format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .send({ templateId: IDS.tmpl, departmentId: IDS.dept, deadline: 'bad' })
        .expect(400);
    });

    it('should allow leader to create task', async () => {
      const { response, data } = await apiCreateTask(app, leaderToken);
      expect(response.status).toBe(201);
      expect(data.creatorId).toBe(IDS.leader);
    });
  });

  // 2. GET /api/v1/tasks
  describe('GET /tasks', () => {
    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10, departmentId: IDS.dept }).expect(200);
      const d = getData(res.body);
      expect(d).toHaveProperty('list');
      expect(d).toHaveProperty('total');
      expect(Array.isArray(d.list)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/tasks').expect(401);
    });

    it('should filter by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending', departmentId: IDS.dept }).expect(200);
      for (const t of getData(res.body).list) {
        expect(t.status).toBe('pending');
      }
    });

    it('should filter by departmentId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .query({ departmentId: IDS.dept }).expect(200);
      for (const t of getData(res.body).list) {
        expect(t.departmentId).toBe(IDS.dept);
      }
    });

    it('should include relations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .query({ departmentId: IDS.dept, limit: 1 }).expect(200);
      const list = getData(res.body).list;
      if (list.length > 0) {
        expect(list[0]).toHaveProperty('template');
        expect(list[0]).toHaveProperty('department');
        expect(list[0]).toHaveProperty('creator');
      }
    });

    it('should restrict user to own department', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks').set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      for (const t of getData(res.body).list) {
        expect(t.departmentId).toBe(IDS.dept);
      }
    });

    it('should respect page and limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks').set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 2 }).expect(200);
      const d = getData(res.body);
      expect(d.list.length).toBeLessThanOrEqual(2);
      expect(d.page).toBe(1);
      expect(d.limit).toBe(2);
    });
  });

  // 3. GET /api/v1/tasks/:id
  describe('GET /tasks/:id', () => {
    it('should return task with relations', async () => {
      const id = taskIds[0]; if (!id) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${id}`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      const d = getData(res.body);
      expect(d.id).toBe(id);
      expect(d).toHaveProperty('template');
      expect(d).toHaveProperty('department');
      expect(d).toHaveProperty('creator');
      expect(d).toHaveProperty('records');
    });

    it('should require authentication', async () => {
      const id = taskIds[0]; if (!id) return;
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${id}`).expect(401);
    });

    it('should 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks/no-id')
        .set('Authorization', `Bearer ${adminToken}`).expect(404);
    });

    it('should forbid other-department user', async () => {
      const id = taskIds[0]; if (!id) return;
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${id}`)
        .set('Authorization', `Bearer ${otherToken}`).expect(403);
    });

    it('should allow admin', async () => {
      const id = taskIds[0]; if (!id) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${id}`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(getData(res.body).id).toBe(id);
    });

    it('should allow same-department member', async () => {
      const id = taskIds[0]; if (!id) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${id}`)
        .set('Authorization', `Bearer ${memberToken}`).expect(200);
      expect(getData(res.body).id).toBe(id);
    });
  });

  // 4. PUT /api/v1/tasks/:id
  describe('PUT /tasks/:id', () => {
    let uid: string;
    beforeAll(async () => {
      uid = (await apiCreateTask(app, adminToken)).data.id;
    });

    it('should update deadline', async () => {
      const dl = new Date(Date.now() + 14 * 86400000).toISOString();
      const res = await request(app.getHttpServer())
        .put(`/api/v1/tasks/${uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deadline: dl }).expect(200);
      const actual = new Date(getData(res.body).deadline).toISOString();
      expect(actual).toBe(new Date(dl).toISOString());
    });

    it('should update departmentId', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/tasks/${uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ departmentId: IDS.otherDept }).expect(200);
      expect(getData(res.body).departmentId).toBe(IDS.otherDept);
      await request(app.getHttpServer())
        .put(`/api/v1/tasks/${uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ departmentId: IDS.dept });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/tasks/${uid}`)
        .send({ deadline: FUTURE_DL }).expect(401);
    });

    it('should require admin/creator', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/tasks/${uid}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ deadline: FUTURE_DL }).expect(403);
    });

    it('should 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/tasks/no-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deadline: FUTURE_DL }).expect(404);
    });

    it('should reject non-existent department', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/tasks/${uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ departmentId: 'bad' }).expect(404);
    });

    it('should reject update for non-pending task', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await apiCancelTask(app, data.id, adminToken);
      await request(app.getHttpServer())
        .put(`/api/v1/tasks/${data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deadline: FUTURE_DL }).expect(409);
    });
  });

  // 5. POST /api/v1/tasks/:id/submit
  describe('POST /tasks/:id/submit', () => {
    let sid: string;
    beforeAll(async () => {
      sid = (await apiCreateTask(app, adminToken)).data.id;
    });

    it('should submit with valid data', async () => {
      const { response, data } = await apiSubmitTask(
        app, sid, memberToken,
        { temperature: 95, pressure: 1.0, notes: 'ok' },
      );
      expect(response.status).toBe(201);
      expect(data.status).toBe('submitted');
      expect(data.taskId).toBe(sid);
      expect(data.submitterId).toBe(IDS.member);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${sid}/submit`)
        .send({ data: { temperature: 95 } }).expect(401);
    });

    it('should reject duplicate (BR-014)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${sid}/submit`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { temperature: 100 } }).expect(409);
    });

    it('should reject other-dept user', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${data.id}/submit`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ data: { temperature: 95 } }).expect(403);
    });

    it('should validate required fields', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${data.id}/submit`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { notes: 'no temp' } }).expect(400);
    });

    it('should validate field max', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${data.id}/submit`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { temperature: 250 } }).expect(400);
    });

    it('should reject for cancelled task', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await apiCancelTask(app, data.id, adminToken);
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${data.id}/submit`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { temperature: 95 } }).expect(409);
    });

    it('should 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/no-id/submit')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { temperature: 95 } }).expect(404);
    });
  });

  // 6. POST /api/v1/tasks/:id/draft
  describe('POST /tasks/:id/draft', () => {
    let did: string;
    beforeAll(async () => {
      did = (await apiCreateTask(app, adminToken)).data.id;
    });

    it('should save draft', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${did}/draft`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { temperature: 90 } }).expect(201);
      const d = getData(res.body);
      expect(d.taskId).toBe(did);
      expect(d.status).toBe('pending');
      recordIds.push(d.id);
    });

    it('should allow partial data', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${did}/draft`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { temperature: 92 } }).expect(201);
      expect(getData(res.body)).toHaveProperty('id');
    });

    it('should allow empty body', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${did}/draft`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({}).expect(201);
      expect(getData(res.body)).toHaveProperty('id');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${did}/draft`)
        .send({ data: { temperature: 90 } }).expect(401);
    });

    it('should reject other-dept user', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${did}/draft`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ data: { temperature: 90 } }).expect(403);
    });

    it('should reject for non-pending task', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await apiCancelTask(app, data.id, adminToken);
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${data.id}/draft`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { temperature: 90 } }).expect(409);
    });

    it('should 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/no-id/draft')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ data: { temperature: 90 } }).expect(404);
    });
  });

  // 7. POST /api/v1/tasks/:id/cancel
  describe('POST /tasks/:id/cancel', () => {
    it('should cancel pending task (admin)', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      const res = await apiCancelTask(app, data.id, adminToken);
      expect(res.status).toBe(201);
      expect(getData(res.body).status).toBe('cancelled');
    });

    it('should allow creator to cancel', async () => {
      const { data } = await apiCreateTask(app, leaderToken);
      const res = await apiCancelTask(app, data.id, leaderToken);
      expect(res.status).toBe(201);
      expect(getData(res.body).status).toBe('cancelled');
    });

    it('should require authentication', async () => {
      const id = taskIds[0]; if (!id) return;
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${id}/cancel`).expect(401);
    });

    it('should reject non-admin non-creator', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${data.id}/cancel`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should reject already-cancelled', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await apiCancelTask(app, data.id, adminToken);
      const res = await apiCancelTask(app, data.id, adminToken);
      expect(res.status).toBe(409);
    });

    it('should reject for submitted task', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      await apiSubmitTask(app, data.id, memberToken);
      const res = await apiCancelTask(app, data.id, adminToken);
      expect(res.status).toBe(409);
    });

    it('should 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/no-id/cancel')
        .set('Authorization', `Bearer ${adminToken}`).expect(404);
    });

    it('admin can cancel any pending task', async () => {
      const { data } = await apiCreateTask(app, leaderToken);
      const res = await apiCancelTask(app, data.id, adminToken);
      expect(res.status).toBe(201);
      expect(getData(res.body).status).toBe('cancelled');
    });
  });

  // 8. POST /api/v1/tasks/submit (legacy)
  describe('POST /tasks/submit (legacy)', () => {
    it('should submit via legacy endpoint', async () => {
      const { data: td } = await apiCreateTask(app, adminToken);
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks/submit')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ taskId: td.id, data: { temperature: 100 } })
        .expect(201);
      const d = getData(res.body);
      expect(d.status).toBe('submitted');
      recordIds.push(d.id);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/submit')
        .send({ taskId: 'x', data: { temperature: 100 } })
        .expect(401);
    });
  });

  // 9. POST /api/v1/tasks/approve
  describe('POST /tasks/approve', () => {
    let rid: string;
    beforeAll(async () => {
      const { data: td } = await apiCreateTask(app, adminToken);
      const { data: rd } = await apiSubmitTask(app, td.id, memberToken);
      rid = rd.id;
    });

    it('should approve submitted record', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recordId: rid, status: 'approved', comment: 'ok' })
        .expect(201);
      expect(getData(res.body).success).toBe(true);
    });

    it('should reject double approval', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recordId: rid, status: 'approved' })
        .expect(409);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/approve')
        .send({ recordId: rid, status: 'approved' })
        .expect(401);
    });

    it('should 404 for non-existent record', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recordId: 'no-rec', status: 'approved' })
        .expect(404);
    });

    it('should validate status enum', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recordId: rid, status: 'invalid' })
        .expect(400);
    });
  });

  // 10. GET /api/v1/tasks/pending-approvals
  describe('GET /tasks/pending-approvals', () => {
    it('should return list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/pending-approvals')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      const d = getData(res.body);
      expect(d).toHaveProperty('list');
      expect(d).toHaveProperty('total');
      expect(Array.isArray(d.list)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks/pending-approvals').expect(401);
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/pending-approvals')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 }).expect(200);
      expect(getData(res.body).list.length).toBeLessThanOrEqual(5);
    });
  });

  // 11. Notifications
  describe('Notifications', () => {
    it('should notify on task creation', async () => {
      const before = await prisma.notification.count({
        where: { userId: IDS.member, type: 'task' },
      });
      await apiCreateTask(app, adminToken);
      const after = await prisma.notification.count({
        where: { userId: IDS.member, type: 'task' },
      });
      expect(after).toBeGreaterThan(before);
    });

    it('should notify on task cancellation', async () => {
      const { data } = await apiCreateTask(app, adminToken);
      const before = await prisma.notification.count({
        where: { userId: IDS.member, type: 'task' },
      });
      await apiCancelTask(app, data.id, adminToken);
      const after = await prisma.notification.count({
        where: { userId: IDS.member, type: 'task' },
      });
      expect(after).toBeGreaterThan(before);
    });
  });
});
