import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { REDIS_CLIENT } from '../src/modules/redis/redis.constants';

const TEST_PREFIX = `e2e-rb-${Date.now()}`;
const IDS = {
  admin: `${TEST_PREFIX}-admin`,
  user: `${TEST_PREFIX}-user`,
  dept: `${TEST_PREFIX}-dept`,
  doc: `${TEST_PREFIX}-doc`,
  template: `${TEST_PREFIX}-tpl`,
  task: `${TEST_PREFIX}-task`,
};

function getData(body: any): any {
  return body?.data ?? body;
}

describe('RecycleBinController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;

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

    prisma = app.get<PrismaService>(PrismaService);

    // Create isolated test data
    const hash = await bcrypt.hash('test123456', 10);

    await prisma.department.create({
      data: { id: IDS.dept, code: `${TEST_PREFIX}-cd`, name: 'RBTestDept', status: 'active' },
    });

    await prisma.user.createMany({
      data: [
        { id: IDS.admin, username: `${TEST_PREFIX}-admin`, password: hash, name: 'RBAdmin', role: 'admin', departmentId: IDS.dept, status: 'active' },
        { id: IDS.user, username: `${TEST_PREFIX}-user`, password: hash, name: 'RBUser', role: 'user', departmentId: IDS.dept, status: 'active' },
      ],
    });

    // Login to get tokens
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: `${TEST_PREFIX}-admin`, password: 'test123456' });
    adminToken = getData(adminRes.body)?.token;

    const userRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: `${TEST_PREFIX}-user`, password: 'test123456' });
    userToken = getData(userRes.body)?.token;

    // Create test document
    await prisma.document.create({
      data: {
        id: IDS.doc,
        level: 1,
        title: 'Test Document for Recycle',
        number: `${TEST_PREFIX}-DOC-001`,
        version: 1.0,
        filePath: 'test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        creatorId: IDS.admin,
        status: 'approved',
        deletedAt: new Date(),
      },
    });

    // Create test template
    await prisma.template.create({
      data: {
        id: IDS.template,
        title: 'Test Template for Recycle',
        number: `${TEST_PREFIX}-TPL-001`,
        fieldsJson: [],
        creatorId: IDS.admin,
        deletedAt: new Date(),
      },
    });

    // Create test task
    await prisma.task.create({
      data: {
        id: IDS.task,
        templateId: IDS.template,
        departmentId: IDS.dept,
        deadline: new Date(Date.now() + 86400000),
        creatorId: IDS.admin,
        status: 'pending',
        deletedAt: new Date(),
      },
    });
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await prisma.task.deleteMany({ where: { id: IDS.task } }).catch(() => {});
    await prisma.template.deleteMany({ where: { id: IDS.template } }).catch(() => {});
    await prisma.document.deleteMany({ where: { id: IDS.doc } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { userId: { in: [IDS.admin, IDS.user] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [IDS.admin, IDS.user] } } }).catch(() => {});
    await prisma.department.deleteMany({ where: { id: IDS.dept } }).catch(() => {});
    await app.close();
  }, 30000);

  describe('GET /recycle-bin/:type', () => {
    it('should return deleted documents for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recycle-bin/document')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const data = getData(response.body);
      expect(data).toHaveProperty('list');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.list)).toBe(true);
    });

    it('should return deleted templates for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recycle-bin/template')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const data = getData(response.body);
      expect(data).toHaveProperty('list');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.list)).toBe(true);
    });

    it('should return deleted tasks for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recycle-bin/task')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const data = getData(response.body);
      expect(data).toHaveProperty('list');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.list)).toBe(true);
    });

    it('should support keyword search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recycle-bin/document')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10, keyword: 'Test' })
        .expect(200);

      const data = getData(response.body);
      expect(data).toHaveProperty('list');
    });

    it('should reject non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recycle-bin/document')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 })
        .expect(403);
    });
  });

  describe('POST /recycle-bin/:type/:id/restore', () => {
    it('should restore deleted document', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/recycle-bin/document/${IDS.doc}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // Verify document is restored
      const doc = await prisma.document.findUnique({
        where: { id: IDS.doc },
      });
      expect(doc?.deletedAt).toBeNull();

      // Soft delete it again for other tests
      await prisma.document.update({
        where: { id: IDS.doc },
        data: { deletedAt: new Date() },
      });
    });

    it('should restore deleted template', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/recycle-bin/template/${IDS.template}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // Verify template is restored
      const template = await prisma.template.findUnique({
        where: { id: IDS.template },
      });
      expect(template?.deletedAt).toBeNull();

      // Soft delete it again
      await prisma.template.update({
        where: { id: IDS.template },
        data: { deletedAt: new Date() },
      });
    });

    it('should restore deleted task', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/recycle-bin/task/${IDS.task}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // Verify task is restored
      const task = await prisma.task.findUnique({
        where: { id: IDS.task },
      });
      expect(task?.deletedAt).toBeNull();

      // Soft delete it again
      await prisma.task.update({
        where: { id: IDS.task },
        data: { deletedAt: new Date() },
      });
    });

    it('should reject non-admin users', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/recycle-bin/document/${IDS.doc}/restore`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('DELETE /recycle-bin/:type/:id', () => {
    it('should reject non-admin users', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/recycle-bin/document/${IDS.doc}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should permanently delete document', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/recycle-bin/document/${IDS.doc}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify document is permanently deleted
      const doc = await prisma.document.findUnique({
        where: { id: IDS.doc },
      });
      expect(doc).toBeNull();
    });

    it('should permanently delete template', async () => {
      // First delete task that references this template (due to onDelete: Restrict)
      await request(app.getHttpServer())
        .delete(`/api/v1/recycle-bin/task/${IDS.task}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Then delete template
      await request(app.getHttpServer())
        .delete(`/api/v1/recycle-bin/template/${IDS.template}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify template is permanently deleted
      const template = await prisma.template.findUnique({
        where: { id: IDS.template },
      });
      expect(template).toBeNull();
    });

    it('should permanently delete task', async () => {
      // Task was already deleted in template test above
      // Verify task is permanently deleted
      const task = await prisma.task.findUnique({
        where: { id: IDS.task },
      });
      expect(task).toBeNull();
    });
  });

  describe('POST /recycle-bin/:type/batch-restore', () => {
    beforeEach(async () => {
      // Recreate test data for batch operations
      await prisma.document.upsert({
        where: { id: IDS.doc },
        create: {
          id: IDS.doc,
          level: 1,
          title: 'Test Document for Recycle',
          number: `${TEST_PREFIX}-DOC-001`,
          version: 1.0,
          filePath: 'test.pdf',
          fileName: 'test.pdf',
          fileSize: 1024,
          fileType: 'application/pdf',
          creatorId: IDS.admin,
          status: 'approved',
          deletedAt: new Date(),
        },
        update: {
          deletedAt: new Date(),
        },
      });
    });

    it('should batch restore documents', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/recycle-bin/document/batch-restore')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [IDS.doc] })
        .expect(201);

      // Verify document is restored
      const doc = await prisma.document.findUnique({
        where: { id: IDS.doc },
      });
      expect(doc?.deletedAt).toBeNull();
    });

    it('should reject non-admin users', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/recycle-bin/document/batch-restore')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [IDS.doc] })
        .expect(403);
    });
  });

  describe('DELETE /recycle-bin/:type/batch-delete', () => {
    beforeEach(async () => {
      // Recreate test data for batch operations
      await prisma.document.upsert({
        where: { id: IDS.doc },
        create: {
          id: IDS.doc,
          level: 1,
          title: 'Test Document for Recycle',
          number: `${TEST_PREFIX}-DOC-001`,
          version: 1.0,
          filePath: 'test.pdf',
          fileName: 'test.pdf',
          fileSize: 1024,
          fileType: 'application/pdf',
          creatorId: IDS.admin,
          status: 'approved',
          deletedAt: new Date(),
        },
        update: {
          deletedAt: new Date(),
        },
      });
    });

    it('should reject non-admin users', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/recycle-bin/document/batch-delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [IDS.doc] })
        .expect(403);
    });

    it('should batch permanently delete documents', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/recycle-bin/document/batch-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [IDS.doc] })
        .expect(200);

      // Verify document is permanently deleted
      const doc = await prisma.document.findUnique({
        where: { id: IDS.doc },
      });
      expect(doc).toBeNull();
    });
  });
});
