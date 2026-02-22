import { Test, TestingModule } from '@nestjs/testing';
import { FaultService } from './fault.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StatsService } from './stats.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FaultService', () => {
  let service: FaultService;
  let prisma: any;
  let statsService: any;

  const mockFault = {
    id: 'fault-1',
    faultNumber: 'FR-20260216-001',
    equipmentId: 'eq-1',
    reporterId: 'user-1',
    urgencyLevel: 'normal',
    faultDescription: 'Machine not working',
    status: 'pending',
    deletedAt: null,
    acceptedAt: null,
    completedAt: null,
    reportTime: new Date('2026-02-16'),
    equipment: { id: 'eq-1', code: 'EQ-001', name: 'Test Equipment' },
  };

  beforeEach(async () => {
    prisma = {
      equipmentFault: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    statsService = {
      clearCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaultService,
        { provide: PrismaService, useValue: prisma },
        { provide: StatsService, useValue: statsService },
      ],
    }).compile();

    service = module.get<FaultService>(FaultService);
  });

  describe('create', () => {
    it('should create a fault report', async () => {
      prisma.equipmentFault.findFirst.mockResolvedValue(null);
      prisma.equipmentFault.create.mockResolvedValue(mockFault);

      const result = await service.create({
        equipmentId: 'eq-1',
        reporterId: 'user-1',
        faultDescription: 'Machine not working',
      });

      expect(result.faultNumber).toBeDefined();
      expect(prisma.equipmentFault.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated faults', async () => {
      prisma.equipmentFault.findMany.mockResolvedValue([mockFault]);
      prisma.equipmentFault.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status and urgency', async () => {
      prisma.equipmentFault.findMany.mockResolvedValue([]);
      prisma.equipmentFault.count.mockResolvedValue(0);

      await service.findAll({ status: 'pending', urgencyLevel: 'urgent' });

      const where = prisma.equipmentFault.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('pending');
      expect(where.urgencyLevel).toBe('urgent');
    });
  });

  describe('findMyFaults', () => {
    it('should filter by reporterId', async () => {
      prisma.equipmentFault.findMany.mockResolvedValue([mockFault]);
      prisma.equipmentFault.count.mockResolvedValue(1);

      await service.findMyFaults('user-1', {});

      const where = prisma.equipmentFault.findMany.mock.calls[0][0].where;
      expect(where.reporterId).toBe('user-1');
    });
  });

  describe('findOne', () => {
    it('should return fault with equipment', async () => {
      prisma.equipmentFault.findUnique.mockResolvedValue(mockFault);

      const result = await service.findOne('fault-1');
      expect(result.id).toBe('fault-1');
    });

    it('should throw NotFoundException for missing fault', async () => {
      prisma.equipmentFault.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    it('should accept a pending fault', async () => {
      prisma.equipmentFault.findUnique.mockResolvedValue(mockFault);
      prisma.equipmentFault.update.mockResolvedValue({
        ...mockFault,
        status: 'in_progress',
        assigneeId: 'eng-1',
      });

      const result = await service.accept('fault-1', { assigneeId: 'eng-1' });
      expect(result.status).toBe('in_progress');
    });

    it('should reject accepting a non-pending fault', async () => {
      prisma.equipmentFault.findUnique.mockResolvedValue({
        ...mockFault,
        status: 'in_progress',
      });

      await expect(
        service.accept('fault-1', { assigneeId: 'eng-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('should complete an in-progress fault', async () => {
      prisma.equipmentFault.findUnique.mockResolvedValue({
        ...mockFault,
        status: 'in_progress',
      });
      prisma.equipmentFault.update.mockResolvedValue({
        ...mockFault,
        status: 'completed',
      });

      const result = await service.complete('fault-1', {
        repairDescription: 'Fixed the issue',
        faultCause: 'Worn belt',
        solution: 'Replaced belt',
      });
      expect(result.status).toBe('completed');
    });

    it('should reject completing a pending fault', async () => {
      prisma.equipmentFault.findUnique.mockResolvedValue(mockFault);

      await expect(service.complete('fault-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending fault', async () => {
      prisma.equipmentFault.findUnique.mockResolvedValue(mockFault);
      prisma.equipmentFault.update.mockResolvedValue({
        ...mockFault,
        status: 'cancelled',
      });

      const result = await service.cancel('fault-1');
      expect(result.status).toBe('cancelled');
    });

    it('should reject cancelling a completed fault', async () => {
      prisma.equipmentFault.findUnique.mockResolvedValue({
        ...mockFault,
        status: 'completed',
      });

      await expect(service.cancel('fault-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return fault statistics', async () => {
      prisma.equipmentFault.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(2) // in_progress
        .mockResolvedValueOnce(5); // completed

      prisma.equipmentFault.findMany.mockResolvedValue([
        {
          acceptedAt: new Date('2026-02-16T10:00:00Z'),
          completedAt: new Date('2026-02-16T14:00:00Z'),
        },
      ]);

      const stats = await service.getStats();
      expect(stats.total).toBe(10);
      expect(stats.completed).toBe(5);
      expect(stats.completionRate).toBe('50.0%');
      expect(stats.avgResponseTimeHours).toBe(4);
    });
  });
});
