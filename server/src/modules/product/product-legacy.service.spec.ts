import { ProductService } from './product.service';

describe('ProductService legacy product filing', () => {
  it('一次性创建 active 产品、active 配方和带区域快照的配方行', async () => {
    const tx: any = {
      workshopArea: {
        findUnique: jest.fn().mockResolvedValue({ id: 'area-1', name: '筛粉间', status: 'active' }),
      },
      material: {
        findFirst: jest.fn().mockResolvedValue({ id: 'mat-1', unit: 'kg', name: '面粉' }),
      },
      product: {
        create: jest.fn().mockResolvedValue({ id: 'prod-1', code: 'CP-000001', name: '老产品A' }),
      },
      recipe: {
        create: jest.fn().mockResolvedValue({ id: 'recipe-1', version: 1, status: 'active' }),
      },
      recipeLine: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma: any = {
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const codeGenerator: any = { generate: jest.fn().mockResolvedValue('CP-000001') };
    const service = new ProductService(prisma, {} as any, {} as any, codeGenerator);

    const result = await service.createLegacy({
      name: '老产品A',
      lines: [
        {
          material_id: 'mat-1',
          qty_per_batch: 12.5,
          unit: 'kg',
          is_critical: true,
          area_id: 'area-1',
          notes: '主料',
        },
      ],
    });

    expect(result.product.id).toBe('prod-1');
    expect(tx.product.create).toHaveBeenCalledWith({
      data: {
        company_id: '1',
        code: 'CP-000001',
        name: '老产品A',
        status: 'active',
        source: 'legacy_import',
      },
    });
    expect(tx.recipe.create).toHaveBeenCalledWith({
      data: {
        company_id: '1',
        product_id: 'prod-1',
        version: 1,
        version_note: '历史产品建档',
        status: 'active',
        approved_at: expect.any(Date),
      },
    });
    expect(tx.recipeLine.createMany).toHaveBeenCalledWith({
      data: [
        {
          recipe_id: 'recipe-1',
          material_id: 'mat-1',
          qty_per_batch: 12.5,
          unit: 'kg',
          is_critical: true,
          notes: '主料',
          area_id: 'area-1',
          area_name_snapshot: '筛粉间',
        },
      ],
    });
  });
});
