import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { ExportModule } from './export.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ExportController (Integration)', () => {
  let app: INestApplication;
  let prisma: any;

  const mockDocuments = [
    {
      id: 'doc-1',
      number: '1-IT-001',
      title: '技术方案',
      level: 1,
      version: 1.0,
      status: 'approved',
      creatorId: 'user-1',
      approverId: 'user-2',
      createdAt: new Date('2026-01-01'),
      approvedAt: new Date('2026-01-02'),
      deletedAt: null,
      creator: { id: 'user-1', name: '张三' },
      approver: { id: 'user-2', name: '李四' },
    },
  ];

  beforeAll(async () => {
    const mockPrisma = {
      document: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      task: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      deviationReport: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      approval: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ExportModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /export/documents', () => {
    it('应该返回 200 并下载 Excel 文件', async () => {
      prisma.document.count.mockResolvedValue(1);
      prisma.document.findMany.mockResolvedValue(mockDocuments);

      const response = await request(app.getHttpServer())
        .post('/export/documents')
        .send({ level: 1 })
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(response.headers['content-disposition']).toContain('documents_');
      expect(response.body).toBeDefined();
    });

    it('应该正确处理筛选条件', async () => {
      prisma.document.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .post('/export/documents')
        .send({
          level: 1,
          status: 'approved',
          keyword: '技术',
        })
        .expect(HttpStatus.OK);

      expect(prisma.document.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          level: 1,
          status: 'approved',
          deletedAt: null,
        }),
      });
    });

    it('应该正确处理自定义字段', async () => {
      prisma.document.count.mockResolvedValue(1);
      prisma.document.findMany.mockResolvedValue(mockDocuments);

      await request(app.getHttpServer())
        .post('/export/documents')
        .send({
          fields: ['number', 'title', 'status'],
        })
        .expect(HttpStatus.OK);

      expect(prisma.document.findMany).toHaveBeenCalled();
    });
  });

  describe('POST /export/tasks', () => {
    it('应该返回 200 并下载任务 Excel', async () => {
      prisma.task.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .post('/export/tasks')
        .send({ status: 'pending' })
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(response.headers['content-disposition']).toContain('tasks_');
    });
  });

  describe('POST /export/deviation-reports', () => {
    it('应该返回 200 并下载偏离报告 Excel', async () => {
      prisma.deviationReport.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .post('/export/deviation-reports')
        .send({ status: 'pending' })
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(response.headers['content-disposition']).toContain('deviation_reports_');
    });
  });

  describe('POST /export/approvals', () => {
    it('应该返回 200 并下载审批记录 Excel', async () => {
      prisma.approval.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .post('/export/approvals')
        .send({ status: 'approved' })
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(response.headers['content-disposition']).toContain('approvals_');
    });
  });

  describe('错误处理', () => {
    it('应该处理导出失败（数据库错误）', async () => {
      prisma.document.count.mockRejectedValue(new Error('Database error'));

      const response = await request(app.getHttpServer())
        .post('/export/documents')
        .send({ level: 1 });

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', '导出失败');
    });
  });

  describe('安全性', () => {
    it('应该验证 JWT token（已模拟通过）', async () => {
      prisma.document.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .post('/export/documents')
        .send({ level: 1 })
        .expect(HttpStatus.OK);
    });
  });
});
