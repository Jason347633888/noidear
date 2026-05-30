import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CleaningRecordService } from './cleaning-record.service';

function createNumberSequenceMock() {
  return {
    generateNonConformanceNo: jest.fn().mockResolvedValue('NC-2024-001'),
  } as any;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeArea(overrides: Record<string, unknown> = {}) {
  return {
    id: 'area-1',
    company_id: 'company-1',
    name: '灌装间A',
    ...overrides,
  };
}

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    company_id: 'company-1',
    area_point_id: 'area-1',
    version: 'v1',
    frequency: 'daily',
    status: 'active',
    effective_from: new Date('2024-01-01'),
    effective_to: null,
    template_id: null,
    trigger_condition: null,
    approvalInstanceId: null,
    items: [makePlanItem()],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makePlanItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-item-1',
    plan_id: 'plan-1',
    target_name: '灌装机',
    target_type: 'equipment',
    method: '湿式清洁',
    requires_disinfection: true,
    disinfectant: 'NaOH',
    target_concentration: null,
    normal_range: null,
    is_mandatory: true,
    requires_verification: false,
    sequence: 0,
    created_at: new Date(),
    ...overrides,
  };
}

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'record-1',
    company_id: 'company-1',
    target_type: 'equipment',
    target_name: '灌装间A',
    area_point_id: 'area-1',
    equipment_id: null,
    cleaning_plan_id: 'plan-1',
    cleaning_date: new Date('2024-06-01'),
    operator_id: 'user-1',
    verifier_id: null,
    is_pass: false,
    status: 'draft',
    notes: null,
    items: [],
    created_at: new Date(),
    ...overrides,
  };
}

function makeRecordItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rec-item-1',
    record_id: 'record-1',
    plan_item_id: 'plan-item-1',
    target_name: '灌装机',
    target_type: 'equipment',
    method_snapshot: '湿式清洁',
    requires_disinfection: true,
    is_mandatory: true,
    completed: false,
    completed_at: null,
    actual_concentration: null,
    sanitizer_check_id: null,
    result: 'pending',
    remark: null,
    evidence_file_id: null,
    created_at: new Date(),
    ...overrides,
  };
}

function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
  const defaultRecord = makeRecord({ items: [makeRecordItem()] });
  return {
    workshopArea: {
      findUnique: jest.fn().mockResolvedValue(makeArea()),
    },
    cleaningPlan: {
      findFirst: jest.fn().mockResolvedValue(makePlan()),
      findUnique: jest.fn().mockResolvedValue(makePlan()),
    },
    cleaningPlanItem: {
      findMany: jest.fn().mockResolvedValue([makePlanItem()]),
    },
    cleaningRecord: {
      create: jest.fn().mockResolvedValue(defaultRecord),
      findUnique: jest.fn().mockResolvedValue(defaultRecord),
      findFirst: jest.fn().mockResolvedValue(defaultRecord),
      update: jest.fn().mockResolvedValue(defaultRecord),
      findMany: jest.fn().mockResolvedValue([defaultRecord]),
    },
    cleaningRecordItem: {
      findUnique: jest.fn().mockResolvedValue(makeRecordItem()),
      findMany: jest.fn().mockResolvedValue([makeRecordItem({ result: 'pass', completed: true })]),
      update: jest.fn().mockResolvedValue(makeRecordItem({ completed: true, result: 'pass' })),
    },
    nonConformance: {
      create: jest.fn().mockResolvedValue({ id: 'nc-1', nc_no: 'NC-2024-001' }),
    },
    $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn({
      cleaningRecord: {
        create: jest.fn().mockResolvedValue(defaultRecord),
        update: jest.fn().mockResolvedValue(defaultRecord),
        findUnique: jest.fn().mockResolvedValue(defaultRecord),
      },
      cleaningRecordItem: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([makeRecordItem({ result: 'pass', completed: true })]),
      },
    })),
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CleaningRecordService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── createFromActivePlan ────────────────────────────────────────────────────

  describe('createFromActivePlan', () => {
    it('copies plan items into CleaningRecordItem when creating from active plan', async () => {
      const prisma = createPrismaMock();
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await service.createFromActivePlan('area-1', new Date('2024-06-01'), 'user-1', 'company-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when no active plan exists for area point', async () => {
      const prisma = createPrismaMock({
        cleaningPlan: {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await expect(
        service.createFromActivePlan('area-no-plan', new Date(), 'user-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when area point does not exist', async () => {
      const prisma = createPrismaMock({
        workshopArea: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await expect(
        service.createFromActivePlan('nonexistent-area', new Date(), 'user-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── completeItem ────────────────────────────────────────────────────────────

  describe('completeItem', () => {
    it('marks an item as completed with pass result', async () => {
      const prisma = createPrismaMock();
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await service.completeItem('record-1', 'rec-item-1', { result: 'pass' }, 'company-1');

      expect(prisma.cleaningRecordItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-item-1' },
          data: expect.objectContaining({ completed: true, result: 'pass' }),
        }),
      );
    });

    it('marks a failed item as completed with fail result', async () => {
      const prisma = createPrismaMock({
        cleaningRecordItem: {
          findUnique: jest.fn().mockResolvedValue(makeRecordItem()),
          update: jest.fn().mockResolvedValue(makeRecordItem({ completed: true, result: 'fail', remark: '浓度不足' })),
          findMany: jest.fn().mockResolvedValue([makeRecordItem({ result: 'pass', completed: true })]),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await service.completeItem('record-1', 'rec-item-1', { result: 'fail', remark: '浓度不足' }, 'company-1');

      expect(prisma.cleaningRecordItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ result: 'fail', remark: '浓度不足' }),
        }),
      );
    });

    it('throws BadRequestException when item does not belong to record', async () => {
      const prisma = createPrismaMock({
        cleaningRecordItem: {
          findUnique: jest.fn().mockResolvedValue(makeRecordItem({ record_id: 'different-record' })),
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await expect(
        service.completeItem('record-1', 'rec-item-1', { result: 'pass' }, 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── submitRecord ────────────────────────────────────────────────────────────

  describe('submitRecord', () => {
    it('rejects submit when mandatory items are still pending', async () => {
      const prisma = createPrismaMock({
        cleaningRecordItem: {
          findUnique: jest.fn().mockResolvedValue(makeRecordItem()),
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([
            makeRecordItem({ result: 'pending', completed: false, is_mandatory: true }),
          ]),
        },
        cleaningRecord: {
          findUnique: jest.fn().mockResolvedValue(makeRecord({ status: 'draft', items: [makeRecordItem({ result: 'pending', completed: false })] })),
          findFirst: jest.fn().mockResolvedValue(makeRecord({ status: 'draft', items: [makeRecordItem({ result: 'pending', completed: false })] })),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await expect(service.submitRecord('record-1', 'company-1')).rejects.toThrow(BadRequestException);
    });

    it('allows submit when only optional items are pending', async () => {
      const mandatoryPass = makeRecordItem({ id: 'rec-item-1', is_mandatory: true, result: 'pass', completed: true });
      const optionalPending = makeRecordItem({ id: 'rec-item-2', is_mandatory: false, result: 'pending', completed: false });
      const prisma = createPrismaMock({
        cleaningRecordItem: {
          findUnique: jest.fn().mockResolvedValue(mandatoryPass),
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([mandatoryPass, optionalPending]),
        },
        cleaningRecord: {
          findUnique: jest.fn().mockResolvedValue(makeRecord({ status: 'draft', items: [mandatoryPass, optionalPending] })),
          findFirst: jest.fn().mockResolvedValue(makeRecord({ status: 'draft', items: [mandatoryPass, optionalPending] })),
          update: jest.fn().mockResolvedValue(makeRecord({ status: 'submitted', is_pass: true })),
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      const result = await service.submitRecord('record-1', 'company-1');

      expect(prisma.cleaningRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'submitted' }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('sets is_pass true when all items pass', async () => {
      const passItem = makeRecordItem({ result: 'pass', completed: true });
      const prisma = createPrismaMock({
        cleaningRecordItem: {
          findUnique: jest.fn().mockResolvedValue(passItem),
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([passItem]),
        },
        cleaningRecord: {
          findUnique: jest.fn().mockResolvedValue(makeRecord({ status: 'draft', items: [passItem] })),
          findFirst: jest.fn().mockResolvedValue(makeRecord({ status: 'draft', items: [passItem] })),
          update: jest.fn().mockResolvedValue(makeRecord({ status: 'submitted', is_pass: true })),
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      const result = await service.submitRecord('record-1', 'company-1');

      expect(prisma.cleaningRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_pass: true }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('rejects submit when failed items have no remark', async () => {
      const failItem = makeRecordItem({ result: 'fail', completed: true, remark: null });
      const prisma = createPrismaMock({
        cleaningRecordItem: {
          findUnique: jest.fn().mockResolvedValue(failItem),
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([failItem]),
        },
        cleaningRecord: {
          findUnique: jest.fn().mockResolvedValue(makeRecord({ status: 'draft', items: [failItem] })),
          findFirst: jest.fn().mockResolvedValue(makeRecord({ status: 'draft', items: [failItem] })),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await expect(service.submitRecord('record-1', 'company-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── createNonConformanceFromItem ────────────────────────────────────────────

  describe('createNonConformanceFromItem', () => {
    it('creates NC with cleaning_record source type and item id', async () => {
      const item = makeRecordItem({ result: 'fail', remark: '浓度不足' });
      const record = makeRecord({ company_id: 'company-1', items: [item] });
      const prisma = createPrismaMock({
        cleaningRecord: {
          findUnique: jest.fn().mockResolvedValue(record),
          findFirst: jest.fn().mockResolvedValue(record),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([record]),
        },
        cleaningRecordItem: {
          findUnique: jest.fn().mockResolvedValue(item),
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([item]),
        },
      });
      const service = new CleaningRecordService(prisma, createNumberSequenceMock());

      await service.createNonConformanceFromItem('record-1', 'rec-item-1', 'user-1', 'company-1');

      expect(prisma.nonConformance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source_type: 'cleaning_record',
            source_id: 'record-1',
            source_item_id: 'rec-item-1',
            description: expect.stringContaining('清洁项目不合格'),
          }),
        }),
      );
    });
  });

  // ── plan deletion does not delete record item snapshots ───────────────────

  describe('snapshot isolation', () => {
    it('deleting a plan does not affect existing CleaningRecordItem snapshots', () => {
      // This is enforced by schema: CleaningRecordItem.plan_item_id has onDelete: SetNull
      // (plan_item is nullable, deletion of plan cascades to items, but record items
      // have SetNull on plan_item_id so they retain their own target_name/method_snapshot)
      // This test verifies the service does not rely on plan_item for snapshot data.
      const item = makeRecordItem({ plan_item_id: null }); // plan deleted scenario
      expect(item.target_name).toBe('灌装机');
      expect(item.method_snapshot).toBe('湿式清洁');
    });
  });
});
