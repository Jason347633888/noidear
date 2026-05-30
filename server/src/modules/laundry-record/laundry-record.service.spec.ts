import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LaundryRecordService } from './laundry-record.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'laundry-1',
    company_id: 'company-1',
    work_date: new Date('2024-06-01'),
    shift_type_id: null,
    batch_no: 'BATCH-001',
    washing_method: 'machine',
    disinfection_method: 'chemical',
    disinfectant: 'NaOCl',
    temperature: '60.00',
    duration_min: 30,
    operator_id: 'user-1',
    verifier_id: null,
    status: 'draft',
    notes: null,
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    laundry_work_record_id: 'laundry-1',
    garment_type: 'uniform',
    garment_inventory_id: null,
    area_id: null,
    quantity: 10,
    action: 'wash',
    result: 'pass',
    notes: null,
    evidence_file_id: null,
    created_at: new Date(),
    ...overrides,
  };
}

function makeGarmentInventory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    company_id: 'company-1',
    code: 'GARMENT-001',
    garment_type: 'uniform',
    area_id: null,
    quantity: 100,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
  const defaultRecord = makeRecord({ items: [makeItem()] });
  return {
    laundryWorkRecord: {
      create: jest.fn().mockResolvedValue(defaultRecord),
      findUnique: jest.fn().mockResolvedValue(defaultRecord),
      update: jest.fn().mockResolvedValue(defaultRecord),
      findMany: jest.fn().mockResolvedValue([defaultRecord]),
    },
    laundryWorkRecordItem: {
      create: jest.fn().mockResolvedValue(makeItem()),
      findUnique: jest.fn().mockResolvedValue(makeItem()),
      update: jest.fn().mockResolvedValue(makeItem()),
    },
    garmentInventory: {
      findUnique: jest.fn().mockResolvedValue(makeGarmentInventory()),
    },
    nonConformance: {
      create: jest.fn().mockResolvedValue({ id: 'nc-1', nc_no: 'NC-2024-001' }),
    },
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LaundryRecordService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── createLaundryWorkRecord ─────────────────────────────────────────────────

  describe('createLaundryWorkRecord', () => {
    it('creates a laundry work record in draft status', async () => {
      const prisma = createPrismaMock();
      const service = new LaundryRecordService(prisma);

      await service.createLaundryWorkRecord({
        company_id: 'company-1',
        work_date: new Date('2024-06-01'),
        batch_no: 'BATCH-001',
        washing_method: 'machine',
        operator_id: 'user-1',
        items: [],
      });

      expect(prisma.laundryWorkRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            company_id: 'company-1',
            status: 'draft',
          }),
        }),
      );
    });

    it('stores garment type and quantity in items', async () => {
      const createdRecord = makeRecord({ id: 'laundry-1', items: [] });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          create: jest.fn().mockResolvedValue(createdRecord),
          findUnique: jest.fn().mockResolvedValue(makeRecord({ items: [makeItem()] })),
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([createdRecord]),
        },
      });
      const service = new LaundryRecordService(prisma);

      await service.createLaundryWorkRecord({
        company_id: 'company-1',
        work_date: new Date('2024-06-01'),
        operator_id: 'user-1',
        items: [
          { garment_type: 'uniform', quantity: 10, action: 'wash', result: 'pass' },
        ],
      });

      expect(prisma.laundryWorkRecordItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            garment_type: 'uniform',
            quantity: 10,
            action: 'wash',
            result: 'pass',
          }),
        }),
      );
    });

    it('item can link GarmentInventory by garment_inventory_id', async () => {
      const createdRecord = makeRecord({ id: 'laundry-1', items: [] });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          create: jest.fn().mockResolvedValue(createdRecord),
          findUnique: jest.fn().mockResolvedValue(
            makeRecord({ items: [makeItem({ garment_inventory_id: 'inv-1' })] }),
          ),
          update: jest.fn(),
          findMany: jest.fn().mockResolvedValue([createdRecord]),
        },
      });
      const service = new LaundryRecordService(prisma);

      await service.createLaundryWorkRecord({
        company_id: 'company-1',
        work_date: new Date('2024-06-01'),
        operator_id: 'user-1',
        items: [
          {
            garment_type: 'uniform',
            quantity: 5,
            action: 'disinfect',
            result: 'pass',
            garment_inventory_id: 'inv-1',
          },
        ],
      });

      expect(prisma.laundryWorkRecordItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ garment_inventory_id: 'inv-1' }),
        }),
      );
    });
  });

  // ── submitLaundryWorkRecord ─────────────────────────────────────────────────

  describe('submitLaundryWorkRecord', () => {
    it('transitions status from draft to submitted', async () => {
      const record = makeRecord({ status: 'draft', items: [makeItem({ result: 'pass' })] });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(record),
          update: jest.fn().mockResolvedValue({ ...record, status: 'submitted' }),
          create: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await service.submitLaundryWorkRecord('laundry-1');

      expect(prisma.laundryWorkRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'submitted' }),
        }),
      );
    });

    it('throws NotFoundException when record does not exist', async () => {
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await expect(service.submitLaundryWorkRecord('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when record is not in draft status', async () => {
      const record = makeRecord({ status: 'submitted' });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(record),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await expect(service.submitLaundryWorkRecord('laundry-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── verifyLaundryWorkRecord ─────────────────────────────────────────────────

  describe('verifyLaundryWorkRecord', () => {
    it('transitions to verified when pass=true', async () => {
      const record = makeRecord({ status: 'submitted' });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(record),
          update: jest.fn().mockResolvedValue({ ...record, status: 'verified', verifier_id: 'verifier-1' }),
          create: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await service.verifyLaundryWorkRecord('laundry-1', 'verifier-1', true);

      expect(prisma.laundryWorkRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'verified', verifier_id: 'verifier-1' }),
        }),
      );
    });

    it('transitions to rejected when pass=false', async () => {
      const record = makeRecord({ status: 'submitted' });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(record),
          update: jest.fn().mockResolvedValue({ ...record, status: 'rejected', verifier_id: 'verifier-1' }),
          create: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await service.verifyLaundryWorkRecord('laundry-1', 'verifier-1', false);

      expect(prisma.laundryWorkRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'rejected', verifier_id: 'verifier-1' }),
        }),
      );
    });

    it('throws NotFoundException when record does not exist', async () => {
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await expect(service.verifyLaundryWorkRecord('nonexistent', 'verifier-1', true)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when record is not submitted', async () => {
      const record = makeRecord({ status: 'draft' });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(record),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await expect(service.verifyLaundryWorkRecord('laundry-1', 'verifier-1', true)).rejects.toThrow(BadRequestException);
    });
  });

  // ── createNonConformanceFromLaundryItem ─────────────────────────────────────

  describe('createNonConformanceFromLaundryItem', () => {
    it('creates NC with laundry_work_record source type and item id', async () => {
      const item = makeItem({ result: 'fail' });
      const record = makeRecord({ company_id: 'company-1', items: [item] });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(record),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn(),
        },
        laundryWorkRecordItem: {
          findUnique: jest.fn().mockResolvedValue(item),
          create: jest.fn(),
          update: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await service.createNonConformanceFromLaundryItem('laundry-1', 'item-1', 'user-1', 'NC-2024-001');

      expect(prisma.nonConformance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source_type: 'laundry_work_record',
            source_id: 'laundry-1',
            source_item_id: 'item-1',
            description: expect.stringContaining('洗涤'),
          }),
        }),
      );
    });

    it('throws NotFoundException when record does not exist', async () => {
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await expect(
        service.createNonConformanceFromLaundryItem('nonexistent', 'item-1', 'user-1', 'NC-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when item does not belong to record', async () => {
      const item = makeItem({ laundry_work_record_id: 'different-record' });
      const record = makeRecord({ items: [item] });
      const prisma = createPrismaMock({
        laundryWorkRecord: {
          findUnique: jest.fn().mockResolvedValue(record),
          update: jest.fn(),
          create: jest.fn(),
          findMany: jest.fn(),
        },
        laundryWorkRecordItem: {
          findUnique: jest.fn().mockResolvedValue(item),
          create: jest.fn(),
          update: jest.fn(),
        },
      });
      const service = new LaundryRecordService(prisma);

      await expect(
        service.createNonConformanceFromLaundryItem('laundry-1', 'item-1', 'user-1', 'NC-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
