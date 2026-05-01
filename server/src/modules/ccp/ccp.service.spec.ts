import { CcpService } from './ccp.service';

describe('CcpService', () => {
  const prisma = {
    cCPRecord: { create: jest.fn(), findMany: jest.fn() },
    cCPPoint: { findMany: jest.fn() },
    productionBatch: { findUnique: jest.fn() },
  };
  let service: CcpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CcpService(prisma as any);
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
});
