import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from '../src/modules/statistics/statistics.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrismaService = {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocumentStatistics', () => {
    it('should return document statistics with all filters', async () => {
      const mockFilters = {
        level: 1 as 1 | 2 | 3,
        departmentId: 'dept-1',
        status: 'published' as const,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };

      const mockGroupByLevelResult = [
        { level: 1, _count: { id: 10 } },
      ];

      const mockGroupByStatusResult = [
        { status: 'published', _count: { id: 10 } },
      ];

      const mockGroupByCreatorResult = [
        { creatorId: 'user-1', _count: { id: 10 } },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.document.count.mockResolvedValue(10);
      mockPrismaService.document.groupBy
        .mockResolvedValueOnce(mockGroupByLevelResult) // byLevel
        .mockResolvedValueOnce(mockGroupByStatusResult) // byStatus
        .mockResolvedValueOnce(mockGroupByCreatorResult); // byCreator

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', departmentId: 'dept-1', department: { id: 'dept-1', name: '测试部门' } }
      ]);

      const result = await service.getDocumentStatistics(mockFilters);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byLevel');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('byDepartment');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('growthRate');
      expect(mockRedisService.setex).toHaveBeenCalled();
    });

    it('should return cached data if available', async () => {
      const mockFilters = { level: 1 as 1 | 2 | 3 };
      const cachedData = {
        total: 10,
        byLevel: [],
        byStatus: [],
        byDepartment: [],
        trend: [],
        growthRate: 0,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getDocumentStatistics(mockFilters);

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.document.count).not.toHaveBeenCalled();
      expect(mockRedisService.setex).not.toHaveBeenCalled();
    });

    it('should calculate growth rate correctly', async () => {
      const mockFilters = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.document.count
        .mockResolvedValueOnce(20) // current period total
        .mockResolvedValueOnce(10); // previous period

      mockPrismaService.document.groupBy
        .mockResolvedValueOnce([{ level: 1, _count: { id: 20 } }])
        .mockResolvedValueOnce([{ status: 'published', _count: { id: 20 } }])
        .mockResolvedValueOnce([{ creatorId: 'user-1', _count: { id: 20 } }]);

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', departmentId: 'dept-1', department: { id: 'dept-1', name: '测试部门' } }
      ]);

      const result = await service.getDocumentStatistics(mockFilters);

      // Growth rate = ((20 - 10) / 10) * 100 = 100%
      expect(result.growthRate).toBe(100);
    });

    it('should handle no previous data (growth rate = 0)', async () => {
      const mockFilters = {
        startDate: '2026-02-01',
        endDate: '2026-02-02', // Short 2-day range to minimize count calls
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.document.count
        .mockResolvedValueOnce(20) // current period total
        .mockResolvedValue(0); // all other counts (trend + previous period)

      mockPrismaService.document.groupBy
        .mockResolvedValueOnce([{ level: 1, _count: { id: 20 } }])
        .mockResolvedValueOnce([{ status: 'published', _count: { id: 20 } }])
        .mockResolvedValueOnce([{ creatorId: 'user-1', _count: { id: 20 } }]);

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', departmentId: 'dept-1', department: { id: 'dept-1', name: '测试部门' } }
      ]);

      const result = await service.getDocumentStatistics(mockFilters);

      expect(result.growthRate).toBe(0);
    });

    it('should calculate percentages correctly', async () => {
      const mockGroupByLevelResult = [
        { level: 1, _count: { id: 30 } },
        { level: 2, _count: { id: 20 } },
        { level: 3, _count: { id: 50 } },
      ];

      const mockGroupByStatusResult = [
        { status: 'published', _count: { id: 100 } },
      ];

      const mockGroupByCreatorResult = [
        { creatorId: 'user-1', _count: { id: 100 } },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.document.count.mockResolvedValue(100);
      mockPrismaService.document.groupBy
        .mockResolvedValueOnce(mockGroupByLevelResult)
        .mockResolvedValueOnce(mockGroupByStatusResult)
        .mockResolvedValueOnce(mockGroupByCreatorResult);

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', departmentId: 'dept-1', department: { id: 'dept-1', name: '测试部门' } }
      ]);

      const result = await service.getDocumentStatistics({});

      // Percentages should be: 30%, 20%, 50%
      expect(result.byLevel).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ level: 1, count: 30, percentage: 30 }),
          expect.objectContaining({ level: 2, count: 20, percentage: 20 }),
          expect.objectContaining({ level: 3, count: 50, percentage: 50 }),
        ]),
      );
    });
  });

  describe('getTaskStatistics', () => {
    it('should return task statistics with completion and overdue rates', async () => {
      const mockFilters = {
        departmentId: 'dept-1',
        status: 'completed' as const,
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.task.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // completed
        .mockResolvedValueOnce(15); // overdue

      mockPrismaService.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          createdAt: new Date('2026-01-01T10:00:00'),
          records: [
            { approvedAt: new Date('2026-01-02T10:00:00'), createdAt: new Date('2026-01-01T10:00:00') },
          ],
        },
      ]);

      mockPrismaService.task.groupBy
        .mockResolvedValueOnce([{ departmentId: 'dept-1', _count: { id: 100 } }])
        .mockResolvedValueOnce([{ templateId: 'template-1', _count: { id: 100 } }])
        .mockResolvedValueOnce([{ status: 'completed', _count: { id: 80 } }, { status: 'pending', _count: { id: 20 } }]);

      mockPrismaService.department.findMany.mockResolvedValue([
        { id: 'dept-1', name: '测试部门' }
      ]);

      mockPrismaService.template.findMany.mockResolvedValue([
        { id: 'template-1', title: '测试模板' }
      ]);

      const result = await service.getTaskStatistics(mockFilters);

      expect(result.total).toBe(100);
      expect(result.completed).toBe(80);
      expect(result.overdue).toBe(15);
      expect(result.completionRate).toBe(80); // (80/100) * 100
      expect(result.overdueRate).toBe(15); // (15/100) * 100
    });

    it('should calculate average completion time', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.task.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);

      // Mock tasks with completion times (24 hours average)
      mockPrismaService.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          createdAt: new Date('2026-01-01T10:00:00'),
          records: [
            { approvedAt: new Date('2026-01-02T10:00:00'), createdAt: new Date('2026-01-01T10:00:00') },
          ],
        },
        {
          id: 'task-2',
          createdAt: new Date('2026-01-03T10:00:00'),
          records: [
            { approvedAt: new Date('2026-01-04T10:00:00'), createdAt: new Date('2026-01-03T10:00:00') },
          ],
        },
      ]);

      mockPrismaService.task.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrismaService.department.findMany.mockResolvedValue([]);
      mockPrismaService.template.findMany.mockResolvedValue([]);

      const result = await service.getTaskStatistics({});

      expect(result.avgCompletionTime).toBe(24); // 24 hours
    });

    it('should handle zero tasks correctly', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.task.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrismaService.task.findMany.mockResolvedValue([]);

      mockPrismaService.task.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockPrismaService.department.findMany.mockResolvedValue([]);
      mockPrismaService.template.findMany.mockResolvedValue([]);

      const result = await service.getTaskStatistics({});

      expect(result.total).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.overdueRate).toBe(0);
      expect(result.avgCompletionTime).toBe(0);
    });
  });

  describe('getApprovalStatistics', () => {
    it('should return approval statistics with approval rate', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.approval.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(70) // approved
        .mockResolvedValueOnce(20) // rejected
        .mockResolvedValueOnce(10); // pending

      mockPrismaService.approval.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-01T10:00:00'), updatedAt: new Date('2026-01-01T12:00:00') },
        { createdAt: new Date('2026-01-02T10:00:00'), updatedAt: new Date('2026-01-02T14:00:00') },
      ]);

      mockPrismaService.approval.groupBy.mockResolvedValue([
        { approverId: 'user-1', _count: { id: 100 } }
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', name: '测试用户' }
      ]);

      const result = await service.getApprovalStatistics({});

      expect(result.total).toBe(100);
      expect(result.approved).toBe(70);
      expect(result.rejected).toBe(20);
      expect(result.pending).toBe(10);
      // Approval rate = (70 / (70 + 20)) * 100 = 77.78%
      expect(result.approvalRate).toBeCloseTo(77.78, 2);
      expect(result.avgApprovalTime).toBeGreaterThan(0);
    });

    it('should calculate average approval time in hours', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.approval.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(10);

      // Mock 2 hours average (7200000 ms)
      mockPrismaService.approval.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-01T10:00:00'), updatedAt: new Date('2026-01-01T12:00:00') },
        { createdAt: new Date('2026-01-02T10:00:00'), updatedAt: new Date('2026-01-02T12:00:00') },
      ]);

      mockPrismaService.approval.groupBy.mockResolvedValue([
        { approverId: 'user-1', _count: { id: 50 } }
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', name: '测试用户' }
      ]);

      const result = await service.getApprovalStatistics({});

      expect(result.avgApprovalTime).toBe(2); // 2 hours
    });

    it('should handle no approved or rejected approvals', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.approval.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(0) // approved
        .mockResolvedValueOnce(0) // rejected
        .mockResolvedValueOnce(10); // pending

      mockPrismaService.approval.findMany.mockResolvedValue([]);

      mockPrismaService.approval.groupBy.mockResolvedValue([
        { approverId: 'user-1', _count: { id: 10 } }
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', name: '测试用户' }
      ]);

      const result = await service.getApprovalStatistics({});

      expect(result.approvalRate).toBe(0);
      expect(result.avgApprovalTime).toBe(0);
    });
  });

  describe('getOverviewStatistics', () => {
    it('should aggregate statistics from all modules', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.document.count.mockResolvedValue(100);
      mockPrismaService.task.count.mockResolvedValue(50);
      mockPrismaService.approval.count.mockResolvedValue(30);

      const result = await service.getOverviewStatistics({});

      expect(result.totals).toEqual({
        documents: 100,
        tasks: 50,
        approvals: 30,
      });
    });

    it('should include key metrics', async () => {
      mockRedisService.get.mockResolvedValue(null);

      // Total counts
      mockPrismaService.document.count
        .mockResolvedValueOnce(100) // total documents
        .mockResolvedValueOnce(20); // monthly documents

      mockPrismaService.task.count
        .mockResolvedValueOnce(100) // total tasks
        .mockResolvedValueOnce(30) // monthly tasks
        .mockResolvedValueOnce(80); // completed tasks

      mockPrismaService.approval.count
        .mockResolvedValueOnce(90) // total approvals
        .mockResolvedValueOnce(25) // monthly approvals
        .mockResolvedValueOnce(70) // approved
        .mockResolvedValueOnce(20); // rejected

      const result = await service.getOverviewStatistics({});

      expect(result.metrics.taskCompletionRate).toBe(80);
      expect(result.metrics.approvalPassRate).toBeCloseTo(77.78, 2);
    });
  });

  describe('Cache management', () => {
    it('should generate consistent cache keys for same filters', async () => {
      const filters1 = { level: 1 as 1 | 2 | 3, departmentId: 'dept-1' };
      const filters2 = { departmentId: 'dept-1', level: 1 as 1 | 2 | 3 }; // Different order

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.document.count.mockResolvedValue(10);
      mockPrismaService.document.groupBy.mockResolvedValue([]);

      await service.getDocumentStatistics(filters1);
      const firstCall = mockRedisService.setex.mock.calls[0][0];

      jest.clearAllMocks();
      mockRedisService.get.mockResolvedValue(null);
      await service.getDocumentStatistics(filters2);
      const secondCall = mockRedisService.setex.mock.calls[0][0];

      expect(firstCall).toBe(secondCall);
    });

    it('should use 5 minute TTL for cache', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.document.count.mockResolvedValue(10);
      mockPrismaService.document.groupBy.mockResolvedValue([]);

      await service.getDocumentStatistics({});

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        expect.any(String),
        300, // 5 minutes in seconds
        expect.any(String),
      );
    });
  });
});
