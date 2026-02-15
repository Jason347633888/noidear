import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { StatisticsModule } from '../src/modules/statistics/statistics.module';
import { StatisticsService } from '../src/modules/statistics/statistics.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';

describe('Statistics Integration Tests', () => {
  let app: INestApplication;
  let statisticsService: StatisticsService;
  let prisma: PrismaService;
  let redisService: RedisService;
  let jwtService: JwtService;
  let validToken: string;

  const mockPrisma: any = {
    document: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
    },
    template: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    task: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    taskRecord: {
      findMany: jest.fn(),
    },
    approval: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    flushall: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        {
          module: class TestRedisModule {},
          providers: [
            {
              provide: 'REDIS_CLIENT',
              useValue: {},
            },
            {
              provide: RedisService,
              useValue: mockRedisService,
            },
          ],
          exports: ['REDIS_CLIENT', RedisService],
          global: true,
        },
        StatisticsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    statisticsService = moduleRef.get<StatisticsService>(StatisticsService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    redisService = moduleRef.get<RedisService>(RedisService);
    jwtService = new JwtService({ secret: 'test-secret' });

    validToken = jwtService.sign({
      sub: 'test-user-id',
      username: 'test-user',
      role: 'admin',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.get.mockResolvedValue(null);
    mockRedisService.setex.mockResolvedValue('OK');
  });

  describe('GET /statistics/documents', () => {
    it('应该成功获取文档统计数据', async () => {
      const mockDepartments = [
        { id: 'dept-1', name: 'Department 1' },
        { id: 'dept-2', name: 'Department 2' },
      ];

      const mockUsers = [
        { id: 'user-1', departmentId: 'dept-1', name: 'User 1' },
        { id: 'user-2', departmentId: 'dept-2', name: 'User 2' },
      ];

      mockPrisma.document.count.mockResolvedValue(10);
      mockPrisma.document.groupBy.mockResolvedValueOnce([
        { level: 1, _count: 5 },
        { level: 2, _count: 3 },
        { level: 3, _count: 2 },
      ]);
      mockPrisma.document.groupBy.mockResolvedValueOnce([
        { status: 'approved', _count: 7 },
        { status: 'pending', _count: 3 },
      ]);
      mockPrisma.document.groupBy.mockResolvedValueOnce([
        { creatorId: 'user-1', _count: 6 },
        { creatorId: 'user-2', _count: 4 },
      ]);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.department.findMany.mockResolvedValue(mockDepartments);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total', 10);
      expect(response.body).toHaveProperty('byLevel');
      expect(response.body.byLevel).toHaveLength(3);
      expect(response.body).toHaveProperty('byDepartment');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body.byStatus).toHaveLength(2);
    });

    it('应该按部门过滤文档统计', async () => {
      const departmentId = 'dept-1';

      mockPrisma.document.count.mockResolvedValue(5);
      mockPrisma.document.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.department.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .query({ departmentId })
        .expect(200);

      expect(response.body.total).toBe(5);
      expect(mockPrisma.document.groupBy).toHaveBeenCalled();
    });

    it('应该按时间范围过滤文档统计', async () => {
      const startDate = '2026-01-01T00:00:00.000Z';
      const endDate = '2026-12-31T23:59:59.999Z';

      mockPrisma.document.count.mockResolvedValue(8);
      mockPrisma.document.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.department.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.total).toBe(8);
    });

    it('应该验证缓存行为（5分钟 TTL）', async () => {
      mockPrisma.document.count.mockResolvedValue(10);
      mockPrisma.document.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.department.findMany.mockResolvedValue([]);

      const response1 = await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        expect.stringContaining('stats:documents:'),
        300,
        expect.any(String),
      );

      const cachedData = JSON.stringify(response1.body);
      mockRedisService.get.mockResolvedValueOnce(cachedData);

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response2.body).toEqual(response1.body);
      expect(mockPrisma.document.count).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /statistics/tasks', () => {
    it('应该成功获取任务统计数据', async () => {
      const mockDepartments = [{ id: 'dept-1', name: 'Department 1' }];
      const mockTemplates = [{ id: 'tpl-1', title: 'Template 1' }];

      const mockTasksWithRecords = [
        {
          id: 'task-1',
          createdAt: new Date('2026-01-01'),
          records: [
            {
              approvedAt: new Date('2026-01-02'),
            },
          ],
        },
        {
          id: 'task-2',
          createdAt: new Date('2026-01-03'),
          records: [
            {
              approvedAt: new Date('2026-01-05'),
            },
          ],
        },
      ];

      mockPrisma.task.count.mockResolvedValue(15);
      mockPrisma.task.groupBy.mockResolvedValueOnce([
        { departmentId: 'dept-1', _count: 10 },
      ]);
      mockPrisma.task.groupBy.mockResolvedValueOnce([
        { templateId: 'tpl-1', _count: 8 },
      ]);
      mockPrisma.task.groupBy.mockResolvedValueOnce([
        { status: 'pending', _count: 7 },
        { status: 'completed', _count: 8 },
      ]);
      mockPrisma.task.findMany.mockResolvedValue(mockTasksWithRecords);
      mockPrisma.department.findMany.mockResolvedValue(mockDepartments);
      mockPrisma.template.findMany.mockResolvedValue(mockTemplates);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/tasks')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total', 15);
      expect(response.body).toHaveProperty('byDepartment');
      expect(response.body).toHaveProperty('byTemplate');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('avgCompletionTime');
      expect(typeof response.body.avgCompletionTime).toBe('number');
    });

    it('应该按部门过滤任务统计', async () => {
      const departmentId = 'dept-1';

      mockPrisma.task.count.mockResolvedValue(8);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.department.findMany.mockResolvedValue([]);
      mockPrisma.template.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/tasks')
        .set('Authorization', `Bearer \${validToken}`)
        .query({ departmentId })
        .expect(200);

      expect(response.body.total).toBe(8);
    });

    it('应该验证 avgCompletionTime 计算（使用 TaskRecord.approvedAt）', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockTasksWithRecords = [
        {
          id: 'task-1',
          createdAt: oneDayAgo,
          records: [
            {
              approvedAt: now,
            },
          ],
        },
      ];

      mockPrisma.task.count.mockResolvedValue(1);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue(mockTasksWithRecords);
      mockPrisma.department.findMany.mockResolvedValue([]);
      mockPrisma.template.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/tasks')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body.avgCompletionTime).toBeGreaterThan(23);
      expect(response.body.avgCompletionTime).toBeLessThan(25);
    });
  });

  describe('GET /statistics/approvals', () => {
    it('应该成功获取审批统计数据', async () => {
      const mockApprovers = [
        { id: 'approver-1', name: 'Approver 1' },
        { id: 'approver-2', name: 'Approver 2' },
      ];

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const mockApprovals = [
        {
          createdAt: oneHourAgo,
          updatedAt: now,
        },
      ];

      mockPrisma.approval.count.mockResolvedValue(20);
      mockPrisma.approval.groupBy.mockResolvedValueOnce([
        { approverId: 'approver-1', _count: 12 },
        { approverId: 'approver-2', _count: 8 },
      ]);
      mockPrisma.approval.groupBy.mockResolvedValueOnce([
        { status: 'approved', _count: 15 },
        { status: 'rejected', _count: 3 },
        { status: 'pending', _count: 2 },
      ]);
      mockPrisma.approval.findMany.mockResolvedValue(mockApprovals);
      mockPrisma.user.findMany.mockResolvedValue(mockApprovers);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/approvals')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total', 20);
      expect(response.body).toHaveProperty('byApprover');
      expect(response.body.byApprover).toHaveLength(2);
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body.byStatus).toHaveLength(3);
      expect(response.body).toHaveProperty('avgApprovalTime');
      expect(typeof response.body.avgApprovalTime).toBe('number');
    });

    it('应该验证 avgApprovalTime 计算', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const mockApprovals = [
        {
          createdAt: twoHoursAgo,
          updatedAt: now,
        },
      ];

      mockPrisma.approval.count.mockResolvedValue(1);
      mockPrisma.approval.groupBy.mockResolvedValue([]);
      mockPrisma.approval.findMany.mockResolvedValue(mockApprovals);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/approvals')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body.avgApprovalTime).toBeCloseTo(2, 1);
    });
  });

  describe('GET /statistics/overview', () => {
    it('应该成功获取总览数据（包含所有 4 个维度数据）', async () => {
      mockPrisma.document.count.mockResolvedValue(50);
      mockPrisma.document.groupBy.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(30);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.approval.count.mockResolvedValue(40);
      mockPrisma.approval.groupBy.mockResolvedValue([]);
      mockPrisma.approval.findMany.mockResolvedValue([]);
      mockPrisma.template.count.mockResolvedValue(10);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.department.findMany.mockResolvedValue([]);
      mockPrisma.template.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/overview')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('documents');
      expect(response.body.documents).toHaveProperty('total', 50);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveProperty('total', 30);
      expect(response.body.tasks).toHaveProperty('avgCompletionTime');

      expect(response.body).toHaveProperty('approvals');
      expect(response.body.approvals).toHaveProperty('total', 40);
      expect(response.body.approvals).toHaveProperty('avgApprovalTime');

      expect(response.body).toHaveProperty('templates');
      expect(response.body.templates).toHaveProperty('total', 10);
    });
  });

  describe('认证验证', () => {
    it('应该在无 JWT token 时返回 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/statistics/tasks')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/statistics/approvals')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/v1/statistics/overview')
        .expect(401);
    });

    it('应该在有效 JWT token 时通过验证', async () => {
      mockPrisma.document.count.mockResolvedValue(0);
      mockPrisma.document.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.department.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
    });

    it('应该在无效 JWT token 时返回 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理零文档的情况', async () => {
      mockPrisma.document.count.mockResolvedValue(0);
      mockPrisma.document.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.department.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.byLevel).toEqual([]);
      expect(response.body.byDepartment).toEqual([]);
      expect(response.body.byStatus).toEqual([]);
    });

    it('应该在无已完成审批时返回 avgApprovalTime = 0', async () => {
      mockPrisma.approval.count.mockResolvedValue(0);
      mockPrisma.approval.groupBy.mockResolvedValue([]);
      mockPrisma.approval.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/approvals')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.avgApprovalTime).toBe(0);
    });

    it('应该在无已完成任务时返回 avgCompletionTime = 0', async () => {
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.department.findMany.mockResolvedValue([]);
      mockPrisma.template.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/statistics/tasks')
        .set('Authorization', `Bearer \${validToken}`)
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.avgCompletionTime).toBe(0);
    });
  });

  describe('查询参数验证', () => {
    it('应该验证 level 参数只能是 1、2 或 3', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .query({ level: 5 })
        .expect(400);
    });

    it('应该验证日期格式', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/statistics/documents')
        .set('Authorization', `Bearer \${validToken}`)
        .query({ startDate: 'invalid-date' })
        .expect(400);
    });
  });
});
