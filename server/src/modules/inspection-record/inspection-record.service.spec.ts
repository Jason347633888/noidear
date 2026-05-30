import { InspectionRecordService } from './inspection-record.service';
import { INSPECTION_APPLIES_TO, INSPECTION_OBJECT_COMPATIBILITY } from './inspection-record.constants';

describe('InspectionRecordService', () => {
  it('creates nonconformance for failed inspection item with source_item_id', async () => {
    const prisma = {
      inspectionStandard: {
        findUnique: jest.fn().mockResolvedValue({ id: 'standard-1', applies_to: 'material' }),
      },
      inspectionRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'record-1',
          items: [{ id: 'item-1', judgment: 'fail' }],
        }),
      },
      nonConformance: {
        create: jest.fn().mockResolvedValue({ id: 'nc-1', source_item_id: 'item-1' }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };
    const numberSequence = {
      generateNonConformanceNo: jest.fn().mockResolvedValue('NC-2026-0001'),
    };
    const service = new InspectionRecordService(prisma as any, numberSequence as any);

    await service.create({
      company_id: 'tenant-1',
      inspectionStandardId: 'standard-1',
      objectType: 'material_batch',
      objectId: 'batch-1',
      inspectedAt: new Date().toISOString(),
      items: [
        {
          inspectionItemId: 'standard-item-1',
          itemName: '水分',
          actualValue: '12',
          judgment: 'fail',
        },
      ],
    } as any);

    expect(prisma.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: 'tenant-1',
        source_type: 'inspection_record',
        source_id: 'record-1',
        source_item_id: 'item-1',
      }),
    });
  });

  it('does not create nonconformance when all items pass', async () => {
    const prisma = {
      inspectionRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'record-2',
          items: [{ id: 'item-2', judgment: 'pass' }],
        }),
      },
      nonConformance: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };
    const numberSequence = { generateNonConformanceNo: jest.fn() };
    const service = new InspectionRecordService(prisma as any, numberSequence as any);

    await service.create({
      company_id: 'tenant-1',
      objectType: 'product',
      objectId: 'prod-1',
      inspectedAt: new Date().toISOString(),
      items: [{ itemName: '外观', judgment: 'pass' }],
    } as any);

    expect(prisma.nonConformance.create).not.toHaveBeenCalled();
    expect(numberSequence.generateNonConformanceNo).not.toHaveBeenCalled();
  });

  it('creates one nonconformance per failed item, each with a unique nc_no', async () => {
    const prisma = {
      inspectionRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'record-3',
          items: [
            { id: 'item-3a', judgment: 'fail' },
            { id: 'item-3b', judgment: 'fail' },
          ],
        }),
      },
      nonConformance: { create: jest.fn().mockResolvedValue({ id: 'nc-x' }) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };
    const numberSequence = {
      generateNonConformanceNo: jest
        .fn()
        .mockResolvedValueOnce('NC-2026-0001')
        .mockResolvedValueOnce('NC-2026-0002'),
    };
    const service = new InspectionRecordService(prisma as any, numberSequence as any);

    await service.create({
      company_id: 'tenant-1',
      objectType: 'material_batch',
      objectId: 'batch-2',
      inspectedAt: new Date().toISOString(),
      items: [
        { itemName: '水分', judgment: 'fail' },
        { itemName: '杂质', judgment: 'fail' },
      ],
    } as any);

    expect(prisma.nonConformance.create).toHaveBeenCalledTimes(2);
    expect(numberSequence.generateNonConformanceNo).toHaveBeenCalledTimes(2);
    expect(prisma.nonConformance.create).toHaveBeenNthCalledWith(
      1,
      { data: expect.objectContaining({ source_item_id: 'item-3a', nc_no: 'NC-2026-0001' }) },
    );
    expect(prisma.nonConformance.create).toHaveBeenNthCalledWith(
      2,
      { data: expect.objectContaining({ source_item_id: 'item-3b', nc_no: 'NC-2026-0002' }) },
    );
  });
});

// ---------------------------------------------------------------------------
// InspectionStandard applies_to expansion tests
// ---------------------------------------------------------------------------

describe('INSPECTION_APPLIES_TO constants', () => {
  it('exports all required applies_to values', () => {
    const expected = [
      'material',
      'product',
      'area_point',
      'equipment',
      'supplier',
      'water',
      'vehicle',
      'personnel',
      'retained_sample',
      'shelf_life_study',
    ];
    expect([...INSPECTION_APPLIES_TO].sort()).toEqual([...expected].sort());
  });

  it('INSPECTION_OBJECT_COMPATIBILITY covers every applies_to value', () => {
    for (const appliesTo of INSPECTION_APPLIES_TO) {
      expect(INSPECTION_OBJECT_COMPATIBILITY).toHaveProperty(appliesTo);
      expect(INSPECTION_OBJECT_COMPATIBILITY[appliesTo].length).toBeGreaterThan(0);
    }
  });

  it.each([...INSPECTION_APPLIES_TO])(
    'applies_to "%s" is accepted by the service when used as the standard applies_to (contract test)',
    async (appliesTo) => {
      // Pick the first compatible object_type for this applies_to value so that
      // the service does not reject the combination.
      const compatibleObjectTypes = INSPECTION_OBJECT_COMPATIBILITY[appliesTo];
      expect(compatibleObjectTypes).toBeDefined();
      expect(compatibleObjectTypes.length).toBeGreaterThan(0);

      const objectType = compatibleObjectTypes[0];

      const prisma = {
        inspectionStandard: {
          findUnique: jest.fn().mockResolvedValue({ id: 'std-1', applies_to: appliesTo }),
        },
        inspectionRecord: {
          create: jest.fn().mockResolvedValue({ id: 'rec-1', items: [] }),
        },
        nonConformance: { create: jest.fn() },
        $transaction: jest.fn(),
      };
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
      );
      const numberSequence = { generateNonConformanceNo: jest.fn() };
      const service = new InspectionRecordService(prisma as any, numberSequence as any);

      await expect(
        service.create({
          company_id: 'tenant-1',
          inspectionStandardId: 'std-1',
          objectType,
          objectId: 'obj-1',
          inspectedAt: new Date().toISOString(),
          items: [{ itemName: '检验项', judgment: 'pass' }],
        } as any),
      ).resolves.toBeDefined();
    },
  );
});

describe('InspectionStandard – uniqueness constraint (company_id + code)', () => {
  it('propagates a P2002 error thrown by the database during record creation', async () => {
    const prismaUniqueError = Object.assign(
      new Error('Unique constraint failed on the fields: (`company_id`,`code`)'),
      { code: 'P2002', meta: { target: ['company_id', 'code'] } },
    );

    const prisma = {
      inspectionStandard: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      inspectionRecord: {
        // Simulate the DB rejecting with a uniqueness violation
        create: jest.fn().mockRejectedValue(prismaUniqueError),
      },
      nonConformance: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
    );
    const numberSequence = { generateNonConformanceNo: jest.fn() };
    const service = new InspectionRecordService(prisma as any, numberSequence as any);

    // The service must re-throw the P2002 error — it does not swallow DB errors.
    await expect(
      service.create({
        company_id: 'tenant-1',
        objectType: 'material',
        objectId: 'batch-1',
        inspectedAt: new Date().toISOString(),
        items: [{ itemName: '水分', judgment: 'pass' }],
      } as any),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('InspectionRecordService – object_type compatibility validation', () => {
  function makeService(standardAppliesTo: string | null) {
    const prisma = {
      inspectionStandard: {
        findUnique: jest.fn().mockResolvedValue(
          standardAppliesTo !== null
            ? { id: 'std-1', applies_to: standardAppliesTo }
            : null,
        ),
      },
      inspectionRecord: {
        create: jest.fn().mockResolvedValue({ id: 'rec-1', items: [] }),
      },
      nonConformance: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    // Wire $transaction to pass the same prisma mock as TxClient
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    const numberSequence = { generateNonConformanceNo: jest.fn() };
    return { service: new InspectionRecordService(prisma as any, numberSequence as any), prisma };
  }

  const baseDto = {
    company_id: 'tenant-1',
    inspectedAt: new Date().toISOString(),
    items: [{ itemName: '检验项', judgment: 'pass' }],
  };

  it.each([
    // [objectType, standard.applies_to]
    ['material', 'material'],
    ['material_batch', 'material'],
    ['product', 'product'],
    ['production_batch', 'product'],
    ['area_point', 'area_point'],
    ['equipment', 'equipment'],
    ['measuring_equipment', 'equipment'],
    ['supplier', 'supplier'],
    ['area_point', 'water'],
    ['external_party', 'vehicle'],
    ['delivery_note', 'vehicle'],
    ['user', 'personnel'],
    ['personnel', 'personnel'],
    ['retained_sample', 'retained_sample'],
    ['shelf_life_study', 'shelf_life_study'],
  ])(
    'allows object_type "%s" for standard applies_to "%s"',
    async (objectType, appliesTo) => {
      const { service } = makeService(appliesTo);
      await expect(
        service.create({
          ...baseDto,
          inspectionStandardId: 'std-1',
          objectType,
          objectId: 'obj-1',
        } as any),
      ).resolves.toBeDefined();
    },
  );

  it('rejects incompatible object_type for a given standard applies_to', async () => {
    // Standard is for 'material' but record uses 'area_point' — incompatible
    const { service } = makeService('material');
    await expect(
      service.create({
        ...baseDto,
        inspectionStandardId: 'std-1',
        objectType: 'area_point',
        objectId: 'obj-1',
      } as any),
    ).rejects.toThrow();
  });

  it('skips compatibility check when no standard is linked', async () => {
    const { service } = makeService(null);
    await expect(
      service.create({
        ...baseDto,
        objectType: 'area_point',
        objectId: 'obj-1',
      } as any),
    ).resolves.toBeDefined();
  });
});
