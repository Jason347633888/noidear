import { NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';

describe('ProductService archive linkage', () => {
  it('归档产品时同步归档配方并隐藏工序（含 product_id 关联）', async () => {
    const archivedProduct = { id: 'prod-1', company_id: '1', deleted_at: new Date('2026-04-29T08:00:00.000Z') };
    const tx: any = {
      product: {
        update: jest.fn().mockResolvedValue(archivedProduct),
      },
      recipe: {
        findMany: jest.fn().mockResolvedValue([{ id: 'recipe-1' }, { id: 'recipe-2' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      processStep: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };
    const prisma: any = {
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null }),
      },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new ProductService(prisma, {} as any, {} as any, {} as any);

    const result = await service.archive('prod-1');

    expect(result).toBe(archivedProduct);
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-1', company_id: '1', deleted_at: null },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.recipe.findMany).toHaveBeenCalledWith({
      where: { product_id: 'prod-1', company_id: '1' },
      select: { id: true },
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1', company_id: '1' },
      data: { deleted_at: expect.any(Date) },
    });
    expect(tx.recipe.updateMany).toHaveBeenCalledWith({
      where: { product_id: 'prod-1', company_id: '1', status: { not: 'archived' } },
      data: { status: 'archived' },
    });
    expect(tx.processStep.updateMany).toHaveBeenCalledWith({
      where: {
        company_id: '1',
        deleted_at: null,
        OR: [{ product_id: 'prod-1' }, { recipe_id: { in: ['recipe-1', 'recipe-2'] } }],
      },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it('仅通过 recipe_id 关联的工序也在产品归档时被隐藏', async () => {
    const archivedProduct = { id: 'prod-1', company_id: '1', deleted_at: new Date() };
    const tx: any = {
      product: {
        update: jest.fn().mockResolvedValue(archivedProduct),
      },
      recipe: {
        findMany: jest.fn().mockResolvedValue([{ id: 'recipe-only-1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      processStep: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const prisma: any = {
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null }),
      },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new ProductService(prisma, {} as any, {} as any, {} as any);

    await service.archive('prod-1');

    expect(tx.processStep.updateMany).toHaveBeenCalledWith({
      where: {
        company_id: '1',
        deleted_at: null,
        OR: [{ product_id: 'prod-1' }, { recipe_id: { in: ['recipe-only-1'] } }],
      },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it('产品无配方时 OR 条件仅含 product_id', async () => {
    const archivedProduct = { id: 'prod-1', company_id: '1', deleted_at: new Date() };
    const tx: any = {
      product: {
        update: jest.fn().mockResolvedValue(archivedProduct),
      },
      recipe: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      processStep: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma: any = {
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null }),
      },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new ProductService(prisma, {} as any, {} as any, {} as any);

    await service.archive('prod-1');

    expect(tx.processStep.updateMany).toHaveBeenCalledWith({
      where: {
        company_id: '1',
        deleted_at: null,
        OR: [{ product_id: 'prod-1' }, { recipe_id: { in: [] } }],
      },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it('产品不存在时不进入归档事务', async () => {
    const prisma: any = {
      product: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };
    const service = new ProductService(prisma, {} as any, {} as any, {} as any);

    await expect(service.archive('missing-product')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('旧 remove 入口复用归档逻辑', async () => {
    const tx: any = {
      product: {
        update: jest.fn().mockResolvedValue({ id: 'prod-1', deleted_at: new Date() }),
      },
      recipe: {
        findMany: jest.fn().mockResolvedValue([{ id: 'recipe-1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      processStep: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma: any = {
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null }),
      },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new ProductService(prisma, {} as any, {} as any, {} as any);

    await service.remove('prod-1');

    expect(tx.recipe.updateMany).toHaveBeenCalledWith({
      where: { product_id: 'prod-1', company_id: '1', status: { not: 'archived' } },
      data: { status: 'archived' },
    });
    expect(tx.processStep.updateMany).toHaveBeenCalledWith({
      where: {
        company_id: '1',
        deleted_at: null,
        OR: [{ product_id: 'prod-1' }, { recipe_id: { in: ['recipe-1'] } }],
      },
      data: { deleted_at: expect.any(Date) },
    });
  });
});
