import { InspectionRecordService } from './inspection-record.service';

describe('InspectionRecordService', () => {
  it('creates nonconformance for failed inspection item with source_item_id', async () => {
    const prisma = {
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
