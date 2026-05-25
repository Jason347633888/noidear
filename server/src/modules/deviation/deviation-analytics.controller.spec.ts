import { Test, TestingModule } from '@nestjs/testing';
import { DeviationAnalyticsController } from './deviation-analytics.controller';
import { DeviationAnalyticsService } from './deviation-analytics.service';

describe('DeviationAnalyticsController', () => {
  let controller: DeviationAnalyticsController;
  let service: DeviationAnalyticsService;

  const mockDeviationAnalyticsService = {
    getDeviationTrend: jest.fn(),
    getFieldDistribution: jest.fn(),
    getDeviationReasonWordCloud: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviationAnalyticsController],
      providers: [
        {
          provide: DeviationAnalyticsService,
          useValue: mockDeviationAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<DeviationAnalyticsController>(
      DeviationAnalyticsController,
    );
    service = module.get<DeviationAnalyticsService>(
      DeviationAnalyticsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrend', () => {
    it('应该返回偏离趋势数据', async () => {
      const mockData = [
        { date: '2024-01-01', count: 10, rate: 10.0 },
        { date: '2024-01-02', count: 15, rate: 15.0 },
      ];

      mockDeviationAnalyticsService.getDeviationTrend.mockResolvedValue(
        mockData,
      );

      const result = await controller.getTrend({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        granularity: 'day',
      });

      expect(result).toEqual({
        success: true,
        data: mockData,
      });

      expect(service.getDeviationTrend).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'day',
      );
    });
  });

  describe('getFieldDistribution', () => {
    it('应该返回字段分布数据', async () => {
      const mockData = [
        { fieldName: 'temperature', count: 100, percentage: 50.0 },
        { fieldName: 'pressure', count: 80, percentage: 40.0 },
      ];

      mockDeviationAnalyticsService.getFieldDistribution.mockResolvedValue(
        mockData,
      );

      const result = await controller.getFieldDistribution({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toEqual({
        success: true,
        data: mockData,
      });
    });

    it('应该支持不传日期范围', async () => {
      mockDeviationAnalyticsService.getFieldDistribution.mockResolvedValue([]);

      await controller.getFieldDistribution({});

      expect(service.getFieldDistribution).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });
  });

  describe('getReasonWordCloud', () => {
    it('应该返回词云数据', async () => {
      const mockData = [
        { text: '设备故障', value: 10 },
        { text: '温度异常', value: 8 },
      ];

      mockDeviationAnalyticsService.getDeviationReasonWordCloud.mockResolvedValue(
        mockData,
      );

      const result = await controller.getReasonWordCloud();

      expect(result).toEqual({
        success: true,
        data: mockData,
      });
    });
  });
});
