import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { loginForTest } from './test-helpers';

describe.skip('Audit API (e2e) - Unimplemented Feature', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 登录获取 token
    const loginData = await loginForTest(
      app,
      process.env.TEST_USERNAME || 'admin',
      process.env.TEST_PASSWORD || '12345678',
    );
    authToken = loginData.token;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.loginLog.deleteMany({
      where: { username: { contains: 'test' } },
    });
    await prisma.permissionLog.deleteMany({
      where: { operatorName: { contains: 'test' } },
    });
    await prisma.sensitiveLog.deleteMany({
      where: { username: { contains: 'test' } },
    });

    await app.close();
  });

  describe('POST /api/v1/audit/login-logs', () => {
    it('should create a login log', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-1',
          username: 'testuser1',
          action: 'login',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          location: 'Beijing',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe('testuser1');
      expect(response.body.action).toBe('login');
      expect(response.body.status).toBe('success');
    });

    it('should create a failed login log', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-2',
          username: 'testuser2',
          action: 'login_failed',
          ipAddress: '127.0.0.1',
          failReason: 'Invalid password',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.action).toBe('login_failed');
      expect(response.body.status).toBe('failed');
      expect(response.body.failReason).toBe('Invalid password');
    });

    it('should create a logout log', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-3',
          username: 'testuser3',
          action: 'logout',
          ipAddress: '127.0.0.1',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.action).toBe('logout');
      expect(response.body.logoutTime).toBeDefined();
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs')
        .send({
          userId: 'test-user-4',
          username: 'testuser4',
          action: 'login',
          ipAddress: '127.0.0.1',
        })
        .expect(401);
    });

    it('should fail with invalid action', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-5',
          username: 'testuser5',
          action: 'invalid_action',
          ipAddress: '127.0.0.1',
        })
        .expect(400);
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-6',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/audit/permission-logs', () => {
    it('should create a permission log', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/permission-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operatorId: 'test-admin-1',
          operatorName: 'testadmin1',
          targetUserId: 'test-user-1',
          targetUsername: 'testuser1',
          action: 'assign_role',
          beforeValue: '["user"]',
          afterValue: '["user", "admin"]',
          reason: 'Promotion',
          ipAddress: '127.0.0.1',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.operatorName).toBe('testadmin1');
      expect(response.body.action).toBe('assign_role');
      expect(response.body.reason).toBe('Promotion');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit/permission-logs')
        .send({
          operatorId: 'test-admin-2',
          operatorName: 'testadmin2',
          targetUserId: 'test-user-2',
          targetUsername: 'testuser2',
          action: 'revoke_role',
          ipAddress: '127.0.0.1',
        })
        .expect(401);
    });

    it('should fail with invalid action', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit/permission-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operatorId: 'test-admin-3',
          operatorName: 'testadmin3',
          targetUserId: 'test-user-3',
          targetUsername: 'testuser3',
          action: 'invalid_action',
          ipAddress: '127.0.0.1',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/audit/sensitive-logs', () => {
    it('should create a sensitive log', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/sensitive-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-1',
          username: 'testuser1',
          action: 'delete_document',
          resourceType: 'document',
          resourceId: 'test-doc-1',
          resourceName: 'test.pdf',
          details: JSON.stringify({ reason: 'outdated' }),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.action).toBe('delete_document');
      expect(response.body.resourceType).toBe('document');
      expect(response.body.resourceId).toBe('test-doc-1');
    });

    it('should create a sensitive log for export', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/sensitive-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-2',
          username: 'testuser2',
          action: 'export_data',
          resourceType: 'report',
          resourceName: 'monthly_report.xlsx',
          ipAddress: '127.0.0.1',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.action).toBe('export_data');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit/sensitive-logs')
        .send({
          userId: 'test-user-3',
          username: 'testuser3',
          action: 'delete_document',
          resourceType: 'document',
          ipAddress: '127.0.0.1',
        })
        .expect(401);
    });

    it('should fail with invalid action', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit/sensitive-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-4',
          username: 'testuser4',
          action: 'invalid_action',
          resourceType: 'document',
          ipAddress: '127.0.0.1',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/audit/login-logs/query', () => {
    it('should query login logs with pagination', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
    });

    it('should filter login logs by userId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: 'test-user-1', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].userId).toBe('test-user-1');
      }
    });

    it('should filter login logs by action', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/login-logs/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ action: 'login', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/v1/audit/permission-logs/query', () => {
    it('should query permission logs with pagination', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/permission-logs/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('POST /api/v1/audit/sensitive-logs/query', () => {
    it('should query sensitive logs with pagination', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/sensitive-logs/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    it('should filter sensitive logs by resourceType', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/audit/sensitive-logs/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ resourceType: 'document', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/audit/login-logs/export', () => {
    it('should export login logs to Excel', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/audit/login-logs/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('GET /api/v1/audit/dashboard', () => {
    it('should get audit dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/audit/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('login');
      expect(response.body).toHaveProperty('sensitive');
      expect(response.body.login).toHaveProperty('last24h');
      expect(response.body.login).toHaveProperty('last7d');
    });
  });

  describe('GET /api/v1/audit/brcgs-report', () => {
    it('should generate BRCGS compliance report', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/audit/brcgs-report?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });
});
