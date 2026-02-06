import { Test, TestingModule } from '@nestjs/testing';
import { DeviationAnalyticsService } from './deviation-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DeviationAnalyticsService', () => {
  let service: DeviationAnalyticsService;
  let prisma: PrismaService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    deviationReport: {
      groupBy: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    taskRecord: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviationAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DeviationAnalyticsService>(DeviationAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviationTrend', () => {
    it('应该返回按天统计的偏离趋势', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.$queryRaw.mockResolvedValue([
        { date: '2024-01-01', count: '10' },
        { date: '2024-01-02', count: '15' },
        { date: '2024-01-03', count: '8' },
      ]);

      mockPrisma.taskRecord.count.mockResolvedValue(100);

      const result = await service.getDeviationTrend(
        startDate,
        endDate,
        'day',
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        count: 10,
        rate: 10.0,
      });
      expect(result[1]).toEqual({
        date: '2024-01-02',
        count: 15,
        rate: 15.0,
      });
    });

    it('应该返回按周统计的偏离趋势', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.$queryRaw.mockResolvedValue([
        { week: '2024-W01', count: '25' },
        { week: '2024-W02', count: '30' },
      ]);

      mockPrisma.taskRecord.count.mockResolvedValue(200);

      const result = await service.getDeviationTrend(
        startDate,
        endDate,
        'week',
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-W01',
        count: 25,
        rate: 12.5,
      });
    });

    it('应该返回按月统计的偏离趋势', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.$queryRaw.mockResolvedValue([
        { month: '2024-01', count: '50' },
        { month: '2024-02', count: '60' },
      ]);

      mockPrisma.taskRecord.count.mockResolvedValue(500);

      const result = await service.getDeviationTrend(
        startDate,
        endDate,
        'month',
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01',
        count: 50,
        rate: 10.0,
      });
    });
  });

  describe('getFieldDistribution', () => {
    it('应该返回偏离字段分布统计', async () => {
      mockPrisma.deviationReport.groupBy.mockResolvedValue([
        { fieldName: 'temperature', _count: { fieldName: 100 } },
        { fieldName: 'pressure', _count: { fieldName: 80 } },
        { fieldName: 'flow', _count: { fieldName: 60 } },
      ]);

      mockPrisma.deviationReport.count.mockResolvedValue(240);

      const result = await service.getFieldDistribution();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        fieldName: 'temperature',
        count: 100,
        percentage: 41.67,
      });
      expect(result[1]).toEqual({
        fieldName: 'pressure',
        count: 80,
        percentage: 33.33,
      });
    });

    it('应该支持日期范围筛选', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.deviationReport.groupBy.mockResolvedValue([
        { fieldName: 'temperature', _count: { fieldName: 50 } },
      ]);

      mockPrisma.deviationReport.count.mockResolvedValue(50);

      await service.getFieldDistribution(startDate, endDate);

      expect(mockPrisma.deviationReport.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('处理空数据应返回空数组', async () => {
      mockPrisma.deviationReport.groupBy.mockResolvedValue([]);
      mockPrisma.deviationReport.count.mockResolvedValue(0);

      const result = await service.getFieldDistribution();

      expect(result).toEqual([]);
    });
  });

  describe('getDeviationRateByDepartment', () => {
    it('应该返回按部门统计的偏离率', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          department_id: 'dept1',
          department_name: '生产部',
          total_tasks: '100',
          deviation_tasks: '20',
          deviation_rate: '20.00',
        },
        {
          department_id: 'dept2',
          department_name: '质检部',
          total_tasks: '80',
          deviation_tasks: '8',
          deviation_rate: '10.00',
        },
      ]);

      const result = await service.getDeviationRateByDepartment();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        departmentId: 'dept1',
        departmentName: '生产部',
        totalTasks: 100,
        deviationTasks: 20,
        deviationRate: 20.0,
      });
    });

    it('应该支持日期范围筛选', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.getDeviationRateByDepartment(startDate, endDate);

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('getDeviationRateByTemplate', () => {
    it('应该返回按模板统计的偏离率', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          template_id: 'tpl1',
          template_title: '配方A',
          total_tasks: '50',
          deviation_tasks: '10',
          deviation_rate: '20.00',
        },
        {
          template_id: 'tpl2',
          template_title: '配方B',
          total_tasks: '60',
          deviation_tasks: '6',
          deviation_rate: '10.00',
        },
      ]);

      const result = await service.getDeviationRateByTemplate();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        templateId: 'tpl1',
        templateTitle: '配方A',
        totalTasks: 50,
        deviationTasks: 10,
        deviationRate: 20.0,
      });
    });
  });

  describe('getDeviationReasonWordCloud', () => {
    it('应该返回偏离原因词云数据', async () => {
      mockPrisma.deviationReport.findMany.mockResolvedValue([
        { reason: '设备故障导致温度过高' },
        { reason: '原料质量问题导致压力异常' },
        { reason: '设备老化' },
        { reason: '温度传感器故障' },
      ]);

      const result = await service.getDeviationReasonWordCloud();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).toHaveProperty('value');
    });

    it('应该对高频词汇排序', async () => {
      mockPrisma.deviationReport.findMany.mockResolvedValue([
        { reason: '设备故障 设备故障 设备故障' },
        { reason: '温度异常 温度异常' },
        { reason: '压力问题' },
      ]);

      const result = await service.getDeviationReasonWordCloud();

      expect(result[0].value).toBeGreaterThanOrEqual(result[1].value);
    });

    it('处理空数据应返回空数组', async () => {
      mockPrisma.deviationReport.findMany.mockResolvedValue([]);

      const result = await service.getDeviationReasonWordCloud();

      expect(result).toEqual([]);
    });
  });
});
