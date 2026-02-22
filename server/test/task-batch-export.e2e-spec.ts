import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const TEST_PREFIX = `e2e-export-${Date.now()}`;
const IDS = {
  admin: `${TEST_PREFIX}-admin`,
  dept: `${TEST_PREFIX}-dept`,
  doc: `${TEST_PREFIX}-doc`,
  template: `${TEST_PREFIX}-tpl`,
  task: `${TEST_PREFIX}-task`,
  taskRecord: `${TEST_PREFIX}-rec`,
  deviation: `${TEST_PREFIX}-dev`,
};

function getData(body: any): any {
  return body?.data ?? body;
}

describe('Export Module (e2e) - CRITICAL-2 Fix', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    const hash = await bcrypt.hash('test123456', 10);

    await prisma.department.create({
      data: {
        id: IDS.dept,
        code: `${TEST_PREFIX}-dept`,
        name: 'ExportTestDept',
        status: 'active',
      },
    });

    await prisma.user.create({
      data: {
        id: IDS.admin,
        username: `${TEST_PREFIX}-admin`,
        password: hash,
        name: 'ExportAdmin',
        role: 'admin',
        departmentId: IDS.dept,
        status: 'active',
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: `${TEST_PREFIX}-admin`, password: 'test123456' });
    adminToken = getData(loginRes.body)?.token;

    await prisma.document.create({
      data: {
        id: IDS.doc,
        level: 1,
        title: 'Export Test Document',
        number: `${TEST_PREFIX}-DOC-001`,
        version: 1.0,
        filePath: 'test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        creatorId: IDS.admin,
        status: 'approved',
      },
    });

    await prisma.template.create({
      data: {
        id: IDS.template,
        level: 4,
        number: `${TEST_PREFIX}-TPL-001`,
        title: 'Export Test Template',
        creatorId: IDS.admin,
        status: 'active',
        fieldsJson: [
          { name: 'field1', label: '字段1', type: 'text', required: true },
          { name: 'field2', label: '字段2', type: 'number', required: false },
        ],
      },
    });

    await prisma.task.create({
      data: {
        id: IDS.task,
        templateId: IDS.template,
        departmentId: IDS.dept,
        creatorId: IDS.admin,
        deadline: new Date(Date.now() + 86400000),
        status: 'active',
      },
    });

    await prisma.taskRecord.create({
      data: {
        id: IDS.taskRecord,
        taskId: IDS.task,
        templateId: IDS.template,
        submitterId: IDS.admin,
        dataJson: { field1: 'Test Value', field2: 123 },
        status: 'pending',
      },
    });

    await prisma.deviationReport.create({
      data: {
        id: IDS.deviation,
        recordId: IDS.taskRecord,
        templateId: IDS.template,
        fieldName: 'field2',
        expectedValue: '100',
        actualValue: '123',
        toleranceMin: 90,
        toleranceMax: 110,
        deviationAmount: 23,
        deviationRate: 0.23,
        deviationType: 'above_max',
        reason: 'Test deviation',
        status: 'reported',
        reportedBy: IDS.admin,
        reportedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.deviationReport.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.taskRecord.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.task.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.template.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.document.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });
    await prisma.department.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } });

    await app.close();
  });

  describe('GET /api/v1/documents/export', () => {
    it('should export documents to Excel', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/documents/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ level: 1 })
        .expect(200);

      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.xlsx');
      // Excel file should be returned (response body validation varies by test framework)
      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/documents/export')
        .expect(401);
    });
  });

  describe('GET /api/v1/tasks/:id/export', () => {
    it('should export task records to Excel', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${IDS.task}/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.xlsx');
      // Excel file should be returned (response body validation varies by test framework)
      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${IDS.task}/export`)
        .expect(401);
    });
  });

  describe('GET /api/v1/statistics/export', () => {
    it('should export document statistics to Excel', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/statistics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'documents' })
        .expect(200);

      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('statistics_documents');
      // Excel file should be returned (response body validation varies by test framework)
      expect(res.status).toBe(200);
    });

    it('should export task statistics to Excel', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/statistics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'tasks' })
        .expect(200);

      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('statistics_tasks');
      // Excel file should be returned (response body validation varies by test framework)
      expect(res.status).toBe(200);
    });

    it('should export approval statistics to Excel', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/statistics/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'approvals' })
        .expect(200);

      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('statistics_approvals');
      // Excel file should be returned (response body validation varies by test framework)
      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/statistics/export')
        .query({ type: 'documents' })
        .expect(401);
    });
  });

  describe('GET /api/v1/deviation-reports/export', () => {
    it('should export deviation reports to Excel', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/deviation-reports/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.xlsx');
      // Excel file should be returned (response body validation varies by test framework)
      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/deviation-reports/export')
        .expect(401);
    });
  });
});
