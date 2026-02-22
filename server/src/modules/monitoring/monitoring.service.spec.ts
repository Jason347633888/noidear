import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: PrismaService,
          useValue: {
            systemMetric: {
              create: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordMetric', () => {
    it('should record a metric successfully', async () => {
      const dto = {
        metricName: 'test_metric',
        metricValue: 100,
        metricType: 'system' as any,
        tags: '{"host":"localhost"}',
      };

      const mockMetric = { id: BigInt(1), ...dto, timestamp: new Date(), createdAt: new Date() };
      jest.spyOn(prisma.systemMetric, 'create').mockResolvedValue(mockMetric);

      const result = await service.recordMetric(dto);

      expect(result).toEqual(mockMetric);
      expect(prisma.systemMetric.create).toHaveBeenCalledWith({
        data: {
          metricName: dto.metricName,
          metricValue: dto.metricValue,
          metricType: dto.metricType,
          tags: dto.tags,
        },
      });
    });

    it('should handle errors', async () => {
      const dto = {
        metricName: 'test_metric',
        metricValue: 100,
        metricType: 'system' as any,
      };

      jest.spyOn(prisma.systemMetric, 'create').mockRejectedValue(new Error('Database error'));

      await expect(service.recordMetric(dto)).rejects.toThrow('Database error');
    });
  });

  describe('queryMetrics', () => {
    it('should query metrics with pagination', async () => {
      const dto = {
        page: 1,
        limit: 10,
      };

      const mockMetrics = [
        { id: BigInt(1), metricName: 'test', metricValue: 100, metricType: 'system', tags: null, timestamp: new Date(), createdAt: new Date() },
      ];

      jest.spyOn(prisma.systemMetric, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.systemMetric, 'findMany').mockResolvedValue(mockMetrics);

      const result = await service.queryMetrics(dto);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('getMetricStats', () => {
    it('should calculate metric statistics', async () => {
      const mockMetrics = [
        { id: BigInt(1), metricName: 'test', metricValue: 10, metricType: 'system', tags: null, timestamp: new Date(), createdAt: new Date() },
        { id: BigInt(2), metricName: 'test', metricValue: 20, metricType: 'system', tags: null, timestamp: new Date(), createdAt: new Date() },
        { id: BigInt(3), metricName: 'test', metricValue: 30, metricType: 'system', tags: null, timestamp: new Date(), createdAt: new Date() },
      ];

      jest.spyOn(prisma.systemMetric, 'findMany').mockResolvedValue(mockMetrics);

      const result = await service.getMetricStats('test', new Date(), new Date());

      expect(result.count).toBe(3);
      expect(result.min).toBe(10);
      expect(result.max).toBe(30);
      expect(result.avg).toBe(20);
      expect(result.sum).toBe(60);
    });

    it('should return zeros for empty metrics', async () => {
      jest.spyOn(prisma.systemMetric, 'findMany').mockResolvedValue([]);

      const result = await service.getMetricStats('test', new Date(), new Date());

      expect(result.count).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.avg).toBe(0);
      expect(result.sum).toBe(0);
    });
  });

  describe('cleanupOldMetrics', () => {
    it('should delete old metrics', async () => {
      jest.spyOn(prisma.systemMetric, 'deleteMany').mockResolvedValue({ count: 100 });

      const result = await service.cleanupOldMetrics();

      expect(result.count).toBe(100);
      expect(prisma.systemMetric.deleteMany).toHaveBeenCalled();
    });
  });
});
