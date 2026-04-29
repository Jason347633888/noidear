import { NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';

describe('ProductService archive linkage', () => {
  it('归档产品时同步归档配方并隐藏工序', async () => {
    const archivedProduct = { id: 'prod-1', company_id: '1', deleted_at: new Date('2026-04-29T08:00:00.000Z') };
    const tx: any = {
      product: {
        update: jest.fn().mockResolvedValue(archivedProduct),
      },
      recipe: {
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
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1', company_id: '1' },
      data: { deleted_at: expect.any(Date) },
    });
    expect(tx.recipe.updateMany).toHaveBeenCalledWith({
      where: { product_id: 'prod-1', company_id: '1', status: { not: 'archived' } },
      data: { status: 'archived' },
    });
    expect(tx.processStep.updateMany).toHaveBeenCalledWith({
      where: { product_id: 'prod-1', company_id: '1', deleted_at: null },
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
  });
});
