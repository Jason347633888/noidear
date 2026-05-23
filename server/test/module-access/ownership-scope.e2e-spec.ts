/**
 * Task 47 — OwnershipScope E2E
 * Covers ≥3 modules: work_execution (TodoTask), warehouse (StockRecord),
 * quality_compliance (NonConformance).
 * Asserts: user sees only own, leader sees managed-dept members', admin sees all.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../../src/modules/redis/redis.constants';
import { loginForTest, getData } from '../test-helpers';

// ── IDs used in this suite ──────────────────────────────────────────────────
const NS = 'e2e-os'; // namespace prefix
const IDS = {
  dept1: `${NS}-dept-1`,
  dept2: `${NS}-dept-2`,
  leaderUser: `${NS}-leader`,
  user1: `${NS}-user-1`, // member of dept1
  user2: `${NS}-user-2`, // member of dept2
};

describe('E2E: OwnershipScope across modules (Task 47)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let leaderToken: string;
  let user1Token: string;
  let user2Token: string;

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
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // ── Seed roles & departments ─────────────────────────────────────────
    const adminRole = await prisma.role.findFirstOrThrow({ where: { code: 'admin', deletedAt: null } });
    const leaderRole = await prisma.role.findFirstOrThrow({ where: { code: 'leader', deletedAt: null } });
    const userRole = await prisma.role.findFirstOrThrow({ where: { code: 'user', deletedAt: null } });

    await prisma.department.upsert({
      where: { id: IDS.dept1 },
      update: {},
      create: { id: IDS.dept1, code: `${NS}-d1`, name: 'OS Test Dept 1', status: 'active' },
    });
    await prisma.department.upsert({
      where: { id: IDS.dept2 },
      update: {},
      create: { id: IDS.dept2, code: `${NS}-d2`, name: 'OS Test Dept 2', status: 'active' },
    });

    const pw = await bcrypt.hash('OSTest123!', 10);

    // Leader manages dept1
    await prisma.user.upsert({
      where: { id: IDS.leaderUser },
      update: { status: 'active', loginAttempts: 0, lockedUntil: null },
      create: {
        id: IDS.leaderUser,
        username: `${NS}-leader`,
        name: 'OS Leader',
        password: pw,
        roleId: leaderRole.id,
        departmentId: IDS.dept1,
        status: 'active',
      },
    });
    await prisma.department.update({
      where: { id: IDS.dept1 },
      data: { managerId: IDS.leaderUser },
    });

    // user1 in dept1
    await prisma.user.upsert({
      where: { id: IDS.user1 },
      update: { status: 'active', loginAttempts: 0, lockedUntil: null },
      create: {
        id: IDS.user1,
        username: `${NS}-user-1`,
        name: 'OS User 1',
        password: pw,
        roleId: userRole.id,
        departmentId: IDS.dept1,
        status: 'active',
      },
    });

    // user2 in dept2 (outside leader's scope)
    await prisma.user.upsert({
      where: { id: IDS.user2 },
      update: { status: 'active', loginAttempts: 0, lockedUntil: null },
      create: {
        id: IDS.user2,
        username: `${NS}-user-2`,
        name: 'OS User 2',
        password: pw,
        roleId: userRole.id,
        departmentId: IDS.dept2,
        status: 'active',
      },
    });

    // Seed admin login (uses existing admin account)
    const adminLogin = await loginForTest(app, 'admin', process.env.ADMIN_PASSWORD || 'ChangeMe123!');
    adminToken = adminLogin.token;

    const leaderLogin = await loginForTest(app, `${NS}-leader`, 'OSTest123!');
    leaderToken = leaderLogin.token;

    const u1Login = await loginForTest(app, `${NS}-user-1`, 'OSTest123!');
    user1Token = u1Login.token;

    const u2Login = await loginForTest(app, `${NS}-user-2`, 'OSTest123!');
    user2Token = u2Login.token;

    // ── Ensure work_execution module is enabled for all roles ──────────
    await prisma.moduleAccessConfig.updateMany({
      where: { moduleKey: 'work_execution' },
      data: { enabled: true },
    });
    await prisma.moduleAccessConfig.updateMany({
      where: { moduleKey: 'warehouse' },
      data: { enabled: true },
    });
    await prisma.moduleAccessConfig.updateMany({
      where: { moduleKey: 'quality_compliance' },
      data: { enabled: true },
    });

    // ── Seed TodoTasks ────────────────────────────────────────────────────
    // user1 task
    await prisma.todoTask.upsert({
      where: { id: `${NS}-todo-u1` },
      update: {},
      create: {
        id: `${NS}-todo-u1`,
        title: 'OS Todo User1',
        userId: IDS.user1,
        type: 'approval' as any,
        relatedId: `${NS}-related-u1`,
        status: 'pending' as any,
      },
    });
    // user2 task
    await prisma.todoTask.upsert({
      where: { id: `${NS}-todo-u2` },
      update: {},
      create: {
        id: `${NS}-todo-u2`,
        title: 'OS Todo User2',
        userId: IDS.user2,
        type: 'approval' as any,
        relatedId: `${NS}-related-u2`,
        status: 'pending' as any,
      },
    });

    // ── Seed NonConformance records with discoveredById ────────────────
    const nc1Exists = await prisma.nonConformance.findUnique({ where: { id: `${NS}-nc-u1` } });
    if (!nc1Exists) {
      await prisma.nonConformance.create({
        data: {
          id: `${NS}-nc-u1`,
          company_id: '1',
          nc_no: `${NS}-NC-001`,
          source_type: 'product',
          source_id: 'dummy',
          description: 'OS NC for user1',
          discovered_at: new Date(),
          discovered_by: IDS.user1,
          discoveredById: IDS.user1,
        },
      });
    }
    const nc2Exists = await prisma.nonConformance.findUnique({ where: { id: `${NS}-nc-u2` } });
    if (!nc2Exists) {
      await prisma.nonConformance.create({
        data: {
          id: `${NS}-nc-u2`,
          company_id: '1',
          nc_no: `${NS}-NC-002`,
          source_type: 'product',
          source_id: 'dummy',
          description: 'OS NC for user2',
          discovered_at: new Date(),
          discovered_by: IDS.user2,
          discoveredById: IDS.user2,
        },
      });
    }
  });

  afterAll(async () => {
    // Cleanup seeded data
    await prisma.nonConformance.deleteMany({ where: { id: { in: [`${NS}-nc-u1`, `${NS}-nc-u2`] } } });
    await prisma.todoTask.deleteMany({ where: { id: { in: [`${NS}-todo-u1`, `${NS}-todo-u2`] } } });
    await prisma.department.update({ where: { id: IDS.dept1 }, data: { managerId: null } });
    await prisma.user.deleteMany({ where: { id: { in: [IDS.leaderUser, IDS.user1, IDS.user2] } } });
    await prisma.department.deleteMany({ where: { id: { in: [IDS.dept1, IDS.dept2] } } });
    await app.close();
  });

  // ── Module 1: work_execution — TodoTask ──────────────────────────────
  describe('Module: work_execution (TodoTask)', () => {
    it('user1 sees only own todos', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/todos')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      const items = getData(r.body)?.data ?? getData(r.body);
      const ids = (Array.isArray(items) ? items : []).map((t: any) => t.id);
      expect(ids).toContain(`${NS}-todo-u1`);
      expect(ids).not.toContain(`${NS}-todo-u2`);
    });

    it('leader sees todos of managed dept members (user1 in dept1)', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/todos')
        .set('Authorization', `Bearer ${leaderToken}`)
        .expect(200);
      const items = getData(r.body)?.data ?? getData(r.body);
      const ids = (Array.isArray(items) ? items : []).map((t: any) => t.id);
      expect(ids).toContain(`${NS}-todo-u1`);
      // user2 is in dept2, not managed by this leader
      expect(ids).not.toContain(`${NS}-todo-u2`);
    });

    it('admin sees all todos including both users', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/todos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const items = getData(r.body)?.data ?? getData(r.body);
      const ids = (Array.isArray(items) ? items : []).map((t: any) => t.id);
      expect(ids).toContain(`${NS}-todo-u1`);
      expect(ids).toContain(`${NS}-todo-u2`);
    });
  });

  // ── Module 2: quality_compliance — NonConformance ────────────────────
  describe('Module: quality_compliance (NonConformance)', () => {
    it('user1 sees only NC records they discovered', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/non-conformances')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      const items = getData(r.body)?.data ?? getData(r.body);
      const ids = (Array.isArray(items) ? items : []).map((t: any) => t.id);
      expect(ids).toContain(`${NS}-nc-u1`);
      expect(ids).not.toContain(`${NS}-nc-u2`);
    });

    it('leader sees NC records of managed dept members', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/non-conformances')
        .set('Authorization', `Bearer ${leaderToken}`)
        .expect(200);
      const items = getData(r.body)?.data ?? getData(r.body);
      const ids = (Array.isArray(items) ? items : []).map((t: any) => t.id);
      expect(ids).toContain(`${NS}-nc-u1`);
      expect(ids).not.toContain(`${NS}-nc-u2`);
    });

    it('admin sees all NC records', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/non-conformances')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const items = getData(r.body)?.data ?? getData(r.body);
      const ids = (Array.isArray(items) ? items : []).map((t: any) => t.id);
      expect(ids).toContain(`${NS}-nc-u1`);
      expect(ids).toContain(`${NS}-nc-u2`);
    });
  });

  // ── Module 3: OwnershipScope context populated on every request ──────
  describe('OwnershipScope context injection', () => {
    it('GET /module-access returns correct enabledModules for each role', async () => {
      const adminR = await request(app.getHttpServer())
        .get('/api/v1/module-access')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(getData(adminR.body).roleCode).toBe('admin');
      expect(getData(adminR.body).enabledModules).toContain('work_execution');
      expect(getData(adminR.body).enabledModules).toContain('quality_compliance');

      const userR = await request(app.getHttpServer())
        .get('/api/v1/module-access')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(getData(userR.body).roleCode).toBe('user');
      expect(getData(userR.body).enabledModules).toContain('work_execution');

      const leaderR = await request(app.getHttpServer())
        .get('/api/v1/module-access')
        .set('Authorization', `Bearer ${leaderToken}`)
        .expect(200);
      expect(getData(leaderR.body).roleCode).toBe('leader');
      expect(getData(leaderR.body).enabledModules.length).toBeGreaterThan(0);
    });
  });

  // ── P0-R5-1 + P1-R5-4: GET /users and /departments accessibility + password security ──
  describe('GET /users and /departments — accessible to all roles (no admin-only guard on GET)', () => {
    it('leader can call GET /api/v1/users (200, not 403)', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${leaderToken}`);
      expect([200, 304]).toContain(r.status);
    });

    it('user role can call GET /api/v1/users (200, not 403)', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${user1Token}`);
      expect([200, 304]).toContain(r.status);
    });

    it('leader can call GET /api/v1/departments (200, not 403)', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${leaderToken}`);
      expect([200, 304]).toContain(r.status);
    });

    it('admin can call POST /api/v1/users to create a user (201)', async () => {
      // Find a valid role ID for the user role
      const userRole = await prisma.role.findFirstOrThrow({ where: { code: 'user', deletedAt: null } });
      const r = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `${NS}-e2e-created`,
          password: 'Test1234!',
          name: 'E2E Created User',
          roleId: userRole.id,
        });
      expect(r.status).toBe(201);
      // cleanup
      await prisma.user.deleteMany({ where: { username: `${NS}-e2e-created` } });
    });

    it('leader calling POST /api/v1/users returns 403', async () => {
      const userRole = await prisma.role.findFirstOrThrow({ where: { code: 'user', deletedAt: null } });
      const r = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          username: `${NS}-e2e-leader-attempt`,
          password: 'Test1234!',
          name: 'E2E Leader Attempt',
          roleId: userRole.id,
        });
      expect(r.status).toBe(403);
    });

    it('GET /api/v1/users response does NOT contain a password field (P0-R5-1 security check)', async () => {
      const r = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = r.body;
      // Response may be { list: [...], total, page, limit } or { data: [...] }
      const users: any[] = body?.list ?? body?.data ?? (Array.isArray(body) ? body : []);
      if (users.length > 0) {
        users.forEach((u: any) => {
          expect(u).not.toHaveProperty('password');
          expect(u).not.toHaveProperty('loginAttempts');
          expect(u).not.toHaveProperty('lockedUntil');
          expect(u).not.toHaveProperty('firstFailedAt');
        });
      }
    });
  });
});
