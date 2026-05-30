import { BadRequestException } from '@nestjs/common';
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

// ---------------------------------------------------------------------------
// createFromPreset() — specialty inspection preset tests
// ---------------------------------------------------------------------------

describe('InspectionRecordService.createFromPreset()', () => {
  const PRESETS = [
    { code: 'WATER_QUALITY',      objectType: 'area_point'     },
    { code: 'ENV_MICROBIOLOGY',   objectType: 'area_point'     },
    { code: 'PEST_CONTROL',       objectType: 'area_point'     },
    { code: 'HYGIENE_INSPECTION', objectType: 'area_point'     },
    { code: 'VEHICLE_SANITATION', objectType: 'external_party' },
    { code: 'ALLERGEN_TEST',      objectType: 'area_point'     },
  ] as const;

  function makePresetService(presetCode: string, appliesTo: string) {
    const mockStandard = { id: 'std-preset', code: presetCode, applies_to: appliesTo, status: 'active' };
    const prisma = {
      inspectionStandard: {
        findFirst: jest.fn().mockResolvedValue(mockStandard),
        findUnique: jest.fn().mockResolvedValue(mockStandard),
      },
      inspectionRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'rec-preset',
          items: [{ id: 'item-preset', judgment: 'pass' }],
        }),
      },
      nonConformance: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
    );
    const numberSequence = { generateNonConformanceNo: jest.fn() };
    return { service: new InspectionRecordService(prisma as any, numberSequence as any), prisma };
  }

  it.each(PRESETS)(
    'creates InspectionRecord for preset code "$code" with objectType "$objectType"',
    async ({ code, objectType }) => {
      // Map preset code to the standard applies_to value
      const PRESET_APPLIES_TO_MAP: Record<string, string> = {
        WATER_QUALITY:      'water',
        ENV_MICROBIOLOGY:   'area_point',
        PEST_CONTROL:       'area_point',
        HYGIENE_INSPECTION: 'area_point',
        VEHICLE_SANITATION: 'vehicle',
        ALLERGEN_TEST:      'area_point',
      };
      const appliesTo = PRESET_APPLIES_TO_MAP[code];
      const { service, prisma } = makePresetService(code, appliesTo);

      const result = await service.createFromPreset(
        'tenant-1',
        code,
        objectType,
        'obj-1',
        {
          company_id: 'tenant-1',
          objectType,
          objectId: 'obj-1',
          inspectedAt: new Date().toISOString(),
          items: [{ itemName: '检验项', judgment: 'pass' }],
        } as any,
      );

      expect(result).toBeDefined();
      expect(prisma.inspectionStandard.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ company_id: 'tenant-1', code, status: 'active' }),
        }),
      );
      expect(prisma.inspectionRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            object_type: objectType,
            object_id: 'obj-1',
          }),
        }),
      );
    },
  );

  it('throws BadRequestException when no active standard found for preset code', async () => {
    const prisma = {
      inspectionStandard: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      inspectionRecord: { create: jest.fn() },
      nonConformance: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
    );
    const numberSequence = { generateNonConformanceNo: jest.fn() };
    const service = new InspectionRecordService(prisma as any, numberSequence as any);

    await expect(
      service.createFromPreset(
        'tenant-1',
        'WATER_QUALITY',
        'area_point',
        'obj-1',
        {
          company_id: 'tenant-1',
          objectType: 'area_point',
          objectId: 'obj-1',
          inspectedAt: new Date().toISOString(),
          items: [{ itemName: '检验项', judgment: 'pass' }],
        } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when objectType is incompatible with preset standard', async () => {
    // WATER_QUALITY applies_to 'water', compatible with 'area_point' only
    // Using 'production_batch' should fail
    const { service } = makePresetService('WATER_QUALITY', 'water');

    await expect(
      service.createFromPreset(
        'tenant-1',
        'WATER_QUALITY',
        'production_batch', // incompatible
        'obj-1',
        {
          company_id: 'tenant-1',
          objectType: 'production_batch',
          objectId: 'obj-1',
          inspectedAt: new Date().toISOString(),
          items: [{ itemName: '检验项', judgment: 'pass' }],
        } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// Product / Semifinished Inspection Presets (Phase 13 Task 5)
// ---------------------------------------------------------------------------

describe('InspectionRecordService – product inspection preset codes', () => {
  const PRODUCT_PRESET_CODES = [
    'PRODUCT_INSPECTION',
    'SEMIFINISHED_INSPECTION',
    'PRE_RELEASE_INSPECTION',
    'SHELF_LIFE_POINT',
  ] as const;

  it('exports PRODUCT_INSPECTION_PRESET_CODES constant with all four codes', () => {
    // This import will fail (RED) until the constant is exported from the service module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PRODUCT_INSPECTION_PRESET_CODES } = require('./inspection-record.constants');
    expect(PRODUCT_INSPECTION_PRESET_CODES).toBeDefined();
    const codes = [...PRODUCT_INSPECTION_PRESET_CODES] as string[];
    expect(codes.sort()).toEqual([...PRODUCT_PRESET_CODES].sort());
  });

  function makeProductPresetService(presetCode: string, appliesTo: string) {
    const mockStandard = { id: 'std-product', code: presetCode, applies_to: appliesTo, status: 'active' };
    const prisma = {
      inspectionStandard: {
        findFirst: jest.fn().mockResolvedValue(mockStandard),
        findUnique: jest.fn().mockResolvedValue(mockStandard),
      },
      inspectionRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'rec-product',
          items: [{ id: 'item-product', judgment: 'pass' }],
        }),
      },
      nonConformance: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
    );
    const numberSequence = { generateNonConformanceNo: jest.fn() };
    return { service: new InspectionRecordService(prisma as any, numberSequence as any), prisma };
  }

  it('createProductInspectionRecord creates InspectionRecord with object_type production_batch', async () => {
    const { service, prisma } = makeProductPresetService('PRODUCT_INSPECTION', 'product');

    const result = await (service as any).createProductInspectionRecord(
      'batch-001',
      'PRODUCT_INSPECTION',
      {
        company_id: 'tenant-1',
        inspectedAt: new Date().toISOString(),
        items: [{ itemName: '外观', judgment: 'pass' }],
      } as any,
    );

    expect(result).toBeDefined();
    expect(prisma.inspectionStandard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ code: 'PRODUCT_INSPECTION', status: 'active' }),
      }),
    );
    expect(prisma.inspectionRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          object_type: 'production_batch',
          object_id: 'batch-001',
        }),
      }),
    );
  });

  it('createSemifinishedInspectionRecord creates InspectionRecord with object_type production_batch', async () => {
    const { service, prisma } = makeProductPresetService('SEMIFINISHED_INSPECTION', 'product');

    const result = await (service as any).createSemifinishedInspectionRecord(
      'batch-002',
      'SEMIFINISHED_INSPECTION',
      {
        company_id: 'tenant-1',
        inspectedAt: new Date().toISOString(),
        items: [{ itemName: '半成品检验项', judgment: 'pass' }],
      } as any,
    );

    expect(result).toBeDefined();
    expect(prisma.inspectionRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          object_type: 'production_batch',
          object_id: 'batch-002',
        }),
      }),
    );
  });

  it.each([
    { code: 'PRODUCT_INSPECTION',      objectType: 'production_batch' },
    { code: 'SEMIFINISHED_INSPECTION', objectType: 'production_batch' },
    { code: 'PRE_RELEASE_INSPECTION',  objectType: 'production_batch' },
    { code: 'SHELF_LIFE_POINT',        objectType: 'shelf_life_study' },
  ])(
    'preset "$code" resolves to standard applies_to compatible with "$objectType"',
    async ({ code, objectType }) => {
      const appliesTo = objectType === 'shelf_life_study' ? 'shelf_life_study' : 'product';
      const { service, prisma } = makeProductPresetService(code, appliesTo);

      const result = await service.createFromPreset(
        'tenant-1',
        code,
        objectType,
        'obj-preset',
        {
          company_id: 'tenant-1',
          objectType,
          objectId: 'obj-preset',
          inspectedAt: new Date().toISOString(),
          items: [{ itemName: '检验项', judgment: 'pass' }],
        } as any,
      );

      expect(result).toBeDefined();
      expect(prisma.inspectionRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ object_type: objectType }),
        }),
      );
    },
  );
});
