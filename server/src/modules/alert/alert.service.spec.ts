import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from './alert.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AlertService', () => {
  let service: AlertService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        {
          provide: PrismaService,
          useValue: {
            alertRule: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
            },
            alertHistory: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAlertRule', () => {
    it('should create an alert rule successfully', async () => {
      const dto = {
        name: 'High CPU Usage',
        metricName: 'cpu_usage',
        condition: '>' as any,
        threshold: 80,
        severity: 'warning' as any,
      };

      const mockRule = { id: BigInt(1), ...dto, enabled: true, notifyChannels: null, createdAt: new Date(), updatedAt: new Date() };
      jest.spyOn(prisma.alertRule, 'create').mockResolvedValue(mockRule);

      const result = await service.createAlertRule(dto);

      expect(result).toEqual(mockRule);
    });
  });

  describe('updateAlertRule', () => {
    it('should update an alert rule successfully', async () => {
      const mockRule = { 
        id: BigInt(1), 
        name: 'Test Rule', 
        metricName: 'test', 
        condition: '>', 
        threshold: 100, 
        severity: 'info', 
        enabled: true, 
        notifyChannels: null, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      };

      jest.spyOn(prisma.alertRule, 'findUnique').mockResolvedValue(mockRule);
      jest.spyOn(prisma.alertRule, 'update').mockResolvedValue({ ...mockRule, threshold: 200 });

      const result = await service.updateAlertRule('1', { threshold: 200 });

      expect(result.threshold).toBe(200);
    });

    it('should throw NotFoundException if rule not found', async () => {
      jest.spyOn(prisma.alertRule, 'findUnique').mockResolvedValue(null);

      await expect(service.updateAlertRule('999', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAlertRule', () => {
    it('should delete an alert rule successfully', async () => {
      const mockRule = { 
        id: BigInt(1), 
        name: 'Test Rule', 
        metricName: 'test', 
        condition: '>', 
        threshold: 100, 
        severity: 'info', 
        enabled: true, 
        notifyChannels: null, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      };

      jest.spyOn(prisma.alertRule, 'findUnique').mockResolvedValue(mockRule);
      jest.spyOn(prisma.alertRule, 'delete').mockResolvedValue(mockRule);

      const result = await service.deleteAlertRule('1');

      expect(result).toEqual(mockRule);
    });
  });

  describe('toggleAlertRule', () => {
    it('should toggle alert rule status', async () => {
      const mockRule = { 
        id: BigInt(1), 
        name: 'Test Rule', 
        metricName: 'test', 
        condition: '>', 
        threshold: 100, 
        severity: 'info', 
        enabled: true, 
        notifyChannels: null, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      };

      jest.spyOn(prisma.alertRule, 'findUnique').mockResolvedValue(mockRule);
      jest.spyOn(prisma.alertRule, 'update').mockResolvedValue({ ...mockRule, enabled: false });

      const result = await service.toggleAlertRule('1');

      expect(result.enabled).toBe(false);
    });
  });

  describe('queryAlertHistory', () => {
    it('should query alert history with pagination', async () => {
      const mockHistory = [
        { 
          id: BigInt(1), 
          ruleId: BigInt(1), 
          metricValue: 85, 
          triggeredAt: new Date(), 
          resolvedAt: null, 
          status: 'triggered', 
          message: null, 
          notifiedUsers: null, 
          createdAt: new Date(),
          rule: { 
            id: BigInt(1), 
            name: 'Test Rule', 
            metricName: 'cpu_usage', 
            condition: '>', 
            threshold: 80, 
            severity: 'warning', 
            enabled: true, 
            notifyChannels: null, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          }
        },
      ];

      jest.spyOn(prisma.alertHistory, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.alertHistory, 'findMany').mockResolvedValue(mockHistory);

      const result = await service.queryAlertHistory({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      const mockAlert = { 
        id: BigInt(1), 
        ruleId: BigInt(1), 
        metricValue: 85, 
        triggeredAt: new Date(), 
        resolvedAt: null, 
        status: 'triggered', 
        message: null, 
        notifiedUsers: null, 
        createdAt: new Date() 
      };

      jest.spyOn(prisma.alertHistory, 'findUnique').mockResolvedValue(mockAlert);
      jest.spyOn(prisma.alertHistory, 'update').mockResolvedValue({ ...mockAlert, status: 'acknowledged' });

      const result = await service.acknowledgeAlert('1', 'user-123');

      expect(result.status).toBe('acknowledged');
    });
  });
});
