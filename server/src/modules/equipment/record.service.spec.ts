import { Test, TestingModule } from '@nestjs/testing';
import { RecordService } from './record.service';
import { PlanService } from './plan.service';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';
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
    maintenanceRecordItem: {
      findMany: jest.fn(),
    },
    nonConformance: {
      create: jest.fn(),
    },
  };
}

function createMockPlanService() {
  return { generateNextPlan: jest.fn().mockResolvedValue(null) };
}

function createMockStatsService() {
  return { clearCache: jest.fn().mockResolvedValue(undefined) };
}

function createMockNumberSequenceService() {
  return { generateNonConformanceNo: jest.fn().mockResolvedValue('NC-20260530-001') };
}

async function buildModule(prisma: any, planSvc: any, statsSvc: any, numSeqSvc?: any): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      RecordService,
      { provide: PrismaService, useValue: prisma },
      { provide: PlanService, useValue: planSvc },
      { provide: StatsService, useValue: statsSvc },
      { provide: QualityNumberSequenceService, useValue: numSeqSvc ?? createMockNumberSequenceService() },
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
    const module = await buildModule(prisma, planService, statsService, createMockNumberSequenceService());
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

  // Approve/reject side effects are covered by the unified approval callbacks
  // registered in EquipmentModule; see Task 8 in the post-API-cleanup hardening
  // plan for the callback-pattern rewrite that replaces these direct route specs.

  describe('submitMaintenanceRecord', () => {
    const mockItems = [
      { id: 'item-1', maintenanceRecordId: 'rec-1', item_name: 'Check oil level', result: 'pass' },
      { id: 'item-2', maintenanceRecordId: 'rec-1', item_name: 'Inspect belts', result: 'pass' },
    ];

    it('maintenance record can have checklist items', async () => {
      prisma.maintenanceRecord.findUnique.mockResolvedValue({ ...mockRecord, items: mockItems });
      prisma.maintenanceRecordItem.findMany.mockResolvedValue(mockItems);
      prisma.maintenanceRecord.update.mockResolvedValue({ ...mockRecord, status: 'approved' });

      const result = await service.submitMaintenanceRecord('rec-1');
      expect(result.status).toBe('approved');
    });

    it('failed mandatory item blocks submitMaintenanceRecord and throws BadRequestException', async () => {
      const itemsWithFail = [
        { id: 'item-1', maintenanceRecordId: 'rec-1', item_name: 'Check oil level', result: 'fail' },
        { id: 'item-2', maintenanceRecordId: 'rec-1', item_name: 'Inspect belts', result: 'pass' },
      ];
      prisma.maintenanceRecord.findUnique.mockResolvedValue({ ...mockRecord, items: itemsWithFail });
      prisma.maintenanceRecordItem.findMany.mockResolvedValue(itemsWithFail);

      await expect(service.submitMaintenanceRecord('rec-1')).rejects.toThrow(BadRequestException);
    });

    it('sets status to pending_verification when no mandatory fail but some items fail', async () => {
      const itemsMixed = [
        { id: 'item-1', maintenanceRecordId: 'rec-1', item_name: null, result: 'fail' },
        { id: 'item-2', maintenanceRecordId: 'rec-1', item_name: 'Required check', result: 'pass' },
      ];
      prisma.maintenanceRecord.findUnique.mockResolvedValue({ ...mockRecord, items: itemsMixed });
      prisma.maintenanceRecordItem.findMany.mockResolvedValue(itemsMixed);
      prisma.maintenanceRecord.update.mockResolvedValue({ ...mockRecord, status: 'pending_verification' });

      const result = await service.submitMaintenanceRecord('rec-1');
      expect(result.status).toBe('pending_verification');
    });
  });

  describe('createNonConformanceFromMaintenanceItem', () => {
    it('creates NC with source_type maintenance_record and source_item_id', async () => {
      const mockItem = {
        id: 'item-1',
        maintenanceRecordId: 'rec-1',
        item_name: 'Check oil level',
        result: 'fail',
      };
      prisma.maintenanceRecord.findUnique.mockResolvedValue({ ...mockRecord, items: [mockItem] });
      prisma.maintenanceRecordItem.findMany.mockResolvedValue([mockItem]);
      prisma.nonConformance.create.mockResolvedValue({
        id: 'nc-1',
        source_type: 'maintenance_record',
        source_id: 'rec-1',
        source_item_id: 'item-1',
      });

      const result = await service.createNonConformanceFromMaintenanceItem('rec-1', 'item-1', {
        companyId: 'co-1',
        userId: 'user-1',
      });

      expect(result.source_type).toBe('maintenance_record');
      expect(result.source_id).toBe('rec-1');
      expect(result.source_item_id).toBe('item-1');
      expect(prisma.nonConformance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source_type: 'maintenance_record',
            source_id: 'rec-1',
            source_item_id: 'item-1',
          }),
        }),
      );
    });
  });
});
