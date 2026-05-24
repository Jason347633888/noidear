import { Test, TestingModule } from '@nestjs/testing';
import { DeviationAnalyticsService } from './deviation-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DeviationAnalyticsService', () => {
  let service: DeviationAnalyticsService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    deviationReport: {
      groupBy: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviationTrend', () => {
    it('应该返回按天统计的偏离趋势（使用 deviationReport.count，不再使用 record.count）', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.$queryRaw.mockResolvedValue([
        { date: '2024-01-01', count: '10' },
        { date: '2024-01-02', count: '15' },
        { date: '2024-01-03', count: '8' },
      ]);

      mockPrisma.deviationReport.count.mockResolvedValue(100);

      const result = await service.getDeviationTrend(startDate, endDate, 'day');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        count: 10,
        rate: 10.0,
      });
      // Verify we used deviationReport.count, not record.count
      expect(mockPrisma.deviationReport.count).toHaveBeenCalled();
    });

    it('应该返回按周统计的偏离趋势', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrisma.$queryRaw.mockResolvedValue([
        { week: '2024-W01', count: '25' },
        { week: '2024-W02', count: '30' },
      ]);

      mockPrisma.deviationReport.count.mockResolvedValue(200);

      const result = await service.getDeviationTrend(startDate, endDate, 'week');

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

      mockPrisma.deviationReport.count.mockResolvedValue(500);

      const result = await service.getDeviationTrend(startDate, endDate, 'month');

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
    });

    it('处理空数据应返回空数组', async () => {
      mockPrisma.deviationReport.groupBy.mockResolvedValue([]);
      mockPrisma.deviationReport.count.mockResolvedValue(0);

      const result = await service.getFieldDistribution();

      expect(result).toEqual([]);
    });
  });

  describe('getDeviationRateByDepartment', () => {
    it('动态任务表已退役：返回空数组', async () => {
      const result = await service.getDeviationRateByDepartment();
      expect(result).toEqual([]);
    });

    it('提供日期范围参数时仍返回空数组', async () => {
      const result = await service.getDeviationRateByDepartment(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
      expect(result).toEqual([]);
    });
  });

  describe('getDeviationRateByTemplate', () => {
    it('动态模板表已退役：返回空数组', async () => {
      const result = await service.getDeviationRateByTemplate();
      expect(result).toEqual([]);
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

    it('处理空数据应返回空数组', async () => {
      mockPrisma.deviationReport.findMany.mockResolvedValue([]);

      const result = await service.getDeviationReasonWordCloud();

      expect(result).toEqual([]);
    });
  });
});
