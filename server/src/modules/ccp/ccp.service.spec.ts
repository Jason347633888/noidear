import { CcpService } from './ccp.service';

describe('CcpService', () => {
  const prisma = {
    $transaction: jest.fn(),
    cCPRecord: { create: jest.fn(), findMany: jest.fn() },
    cCPPoint: { findMany: jest.fn() },
    productionBatch: { findUnique: jest.fn() },
  };
  const nonConformanceService = {
    createFromCcpDeviation: jest.fn(),
  };
  let service: CcpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CcpService(prisma as any, nonConformanceService as any);
  });

  it('writes CCP records to the authenticated company', async () => {
    prisma.cCPRecord.create.mockResolvedValue({ id: 'r1' });

    await service.createRecord(
      { production_batch_id: 'b1', ccp_point_id: 'p1', is_within_cl: true },
      'u1',
      '2',
    );

    expect(prisma.cCPRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: '2', operator_id: 'u1' }) }),
    );
    expect(nonConformanceService.createFromCcpDeviation).not.toHaveBeenCalled();
  });

  it('finds missing CCPs only from the batch product or recipe', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({
      id: 'b1',
      productId: 'prod-1',
      recipeId: 'recipe-1',
    });
    prisma.cCPRecord.findMany.mockResolvedValue([{ ccp_point_id: 'p-product-filled' }]);
    prisma.cCPPoint.findMany.mockResolvedValue([
      { id: 'p-product-filled', ccp_no: 'CCP-1' },
      { id: 'p-recipe-missing', ccp_no: 'CCP-2' },
    ]);

    await expect(service.findMissingCCPs('b1', '2')).resolves.toEqual([
      { id: 'p-recipe-missing', ccp_no: 'CCP-2' },
    ]);

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'b1' },
      select: { id: true, productId: true, recipeId: true },
    });
    expect(prisma.cCPRecord.findMany).toHaveBeenCalledWith({
      where: { production_batch_id: 'b1', company_id: '2' },
      select: { ccp_point_id: true },
    });
    expect(prisma.cCPPoint.findMany).toHaveBeenCalledWith({
      where: {
        company_id: '2',
        deleted_at: null,
        process_step: {
          company_id: '2',
          deleted_at: null,
          OR: [{ product_id: 'prod-1' }, { recipe_id: 'recipe-1' }],
        },
      },
      orderBy: [{ ccp_no: 'asc' }, { created_at: 'asc' }],
    });
  });

  it('returns an empty list when the production batch does not exist', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue(null);

    await expect(service.findMissingCCPs('missing-batch', '2')).resolves.toEqual([]);

    expect(prisma.cCPRecord.findMany).not.toHaveBeenCalled();
    expect(prisma.cCPPoint.findMany).not.toHaveBeenCalled();
  });

  it('keeps the company boundary in both recorded and expected CCP queries', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({
      id: 'b2',
      productId: 'prod-2',
      recipeId: 'recipe-2',
    });
    prisma.cCPRecord.findMany.mockResolvedValue([]);
    prisma.cCPPoint.findMany.mockResolvedValue([{ id: 'p-company-2' }]);

    await service.findMissingCCPs('b2', 'company-2');

    expect(prisma.cCPRecord.findMany).toHaveBeenCalledWith({
      where: { production_batch_id: 'b2', company_id: 'company-2' },
      select: { ccp_point_id: true },
    });
    expect(prisma.cCPPoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          company_id: 'company-2',
          process_step: expect.objectContaining({ company_id: 'company-2' }),
        }),
      }),
    );
  });

  it('creates a NonConformance in the same transaction when a CCP record is outside the critical limit', async () => {
    const tx = {
      cCPRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'ccp-record-1',
          company_id: '2',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
          measured_value: 93.5,
          measured_text: null,
          unit: 'C',
          is_within_cl: false,
          deviation_action: '隔离待评审',
          operator_id: 'operator-1',
          ccp_point: { ccp_no: 'CCP-BAKE-01' },
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    nonConformanceService.createFromCcpDeviation.mockResolvedValue({ id: 'nc-1' });

    const result = await service.createRecord(
      {
        production_batch_id: 'batch-1',
        ccp_point_id: 'ccp-point-1',
        measured_value: 93.5,
        unit: 'C',
        is_within_cl: false,
        deviation_action: '隔离待评审',
      },
      'operator-1',
      '2',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.cCPRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: '2',
        production_batch_id: 'batch-1',
        ccp_point_id: 'ccp-point-1',
        is_within_cl: false,
        operator_id: 'operator-1',
        monitored_at: expect.any(Date),
      }),
      include: { ccp_point: true },
    });
    expect(nonConformanceService.createFromCcpDeviation).toHaveBeenCalledWith(
      {
        companyId: '2',
        userId: 'operator-1',
        ccpRecord: expect.objectContaining({
          id: 'ccp-record-1',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
        }),
      },
      tx,
    );
    expect(result).toEqual(expect.objectContaining({ id: 'ccp-record-1' }));
  });

  it('rejects the CCP record creation when automatic NonConformance creation fails', async () => {
    const tx = {
      cCPRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'ccp-record-1',
          company_id: '2',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
          is_within_cl: false,
          ccp_point: { ccp_no: 'CCP-BAKE-01' },
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));
    nonConformanceService.createFromCcpDeviation.mockRejectedValue(new Error('NC create failed'));

    await expect(
      service.createRecord(
        { production_batch_id: 'batch-1', ccp_point_id: 'ccp-point-1', is_within_cl: false },
        'operator-1',
        '2',
      ),
    ).rejects.toThrow('NC create failed');
  });
});
