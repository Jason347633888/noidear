import { Test, TestingModule } from '@nestjs/testing';
import { RecordService } from './record.service';
import { PlanService } from './plan.service';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockRecord = {
  id: 'rec-1',
  recordNumber: 'MAINT-20260216-001',
  equipmentId: 'eq-1',
  maintenanceLevel: 'daily',
  maintenanceDate: new Date('2026-02-16'),
  status: 'draft',
  deletedAt: null,
  equipment: { id: 'eq-1', code: 'EQ-001', name: 'Test Equipment' },
  plan: null,
};

function createMockPrisma() {
  return {
    maintenanceRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };
}

function createMockPlanService() {
  return { generateNextPlan: jest.fn().mockResolvedValue(null) };
}

function createMockStatsService() {
  return { clearCache: jest.fn().mockResolvedValue(undefined) };
}

async function buildModule(prisma: any, planSvc: any, statsSvc: any): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      RecordService,
      { provide: PrismaService, useValue: prisma },
      { provide: PlanService, useValue: planSvc },
      { provide: StatsService, useValue: statsSvc },
    ],
  }).compile();
}

describe('RecordService', () => {
  let service: RecordService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let planService: ReturnType<typeof createMockPlanService>;
  let statsService: ReturnType<typeof createMockStatsService>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    planService = createMockPlanService();
    statsService = createMockStatsService();
    const module = await buildModule(prisma, planService, statsService);
    service = module.get<RecordService>(RecordService);
  });

  describe('create', () => {
    it('should create a maintenance record in draft status', async () => {
      prisma.maintenanceRecord.findFirst.mockResolvedValue(null);
      prisma.maintenanceRecord.create.mockResolvedValue(mockRecord);

      const result = await service.create({
        equipmentId: 'eq-1',
        maintenanceLevel: 'daily',
        maintenanceDate: '2026-02-16',
      });

      expect(result.status).toBe('draft');
      expect(prisma.maintenanceRecord.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated records', async () => {
      prisma.maintenanceRecord.findMany.mockResolvedValue([mockRecord]);
      prisma.maintenanceRecord.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by date range', async () => {
      prisma.maintenanceRecord.findMany.mockResolvedValue([]);
      prisma.maintenanceRecord.count.mockResolvedValue(0);

      await service.findAll({ startDate: '2026-01-01', endDate: '2026-12-31' });

      const callArgs = prisma.maintenanceRecord.findMany.mock.calls[0][0];
      expect(callArgs.where.maintenanceDate).toBeDefined();
      expect(callArgs.where.maintenanceDate.gte).toBeDefined();
      expect(callArgs.where.maintenanceDate.lte).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return record with relations', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue(mockRecord);
      const result = await service.findOne('rec-1');
      expect(result.id).toBe('rec-1');
    });

    it('should throw NotFoundException for missing record', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a draft record', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue(mockRecord);
      prisma.maintenanceRecord.update.mockResolvedValue({ ...mockRecord, content: 'Updated' });

      const result = await service.update('rec-1', { content: 'Updated' });
      expect(result.content).toBe('Updated');
    });

    it('should reject updating a submitted record', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue({ ...mockRecord, status: 'submitted' });
      await expect(service.update('rec-1', { content: 'test' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit', () => {
    it('should submit a draft record', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue(mockRecord);
      prisma.maintenanceRecord.update.mockResolvedValue({ ...mockRecord, status: 'submitted' });

      const result = await service.submit('rec-1');
      expect(result.status).toBe('submitted');
    });

    it('should reject submitting a non-draft record', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue({ ...mockRecord, status: 'submitted' });
      await expect(service.submit('rec-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve and generate next plan', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue({ ...mockRecord, status: 'submitted' });
      prisma.maintenanceRecord.update.mockResolvedValue({ ...mockRecord, status: 'approved' });

      const result = await service.approve('rec-1', { reviewerSignature: 'sig-url', reviewerId: 'r1' });

      expect(result.status).toBe('approved');
      expect(planService.generateNextPlan).toHaveBeenCalledWith('eq-1', 'daily', expect.any(Date));
    });

    it('should reject approving a draft record', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue(mockRecord);
      await expect(service.approve('rec-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject a submitted record', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue({ ...mockRecord, status: 'submitted' });
      prisma.maintenanceRecord.update.mockResolvedValue({ ...mockRecord, status: 'rejected' });

      const result = await service.reject('rec-1', { rejectReason: 'Incomplete data' });
      expect(result.status).toBe('rejected');
    });

    it('should reject rejecting a draft record', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue(mockRecord);
      await expect(service.reject('rec-1', { rejectReason: 'test' })).rejects.toThrow(BadRequestException);
    });
  });
});
