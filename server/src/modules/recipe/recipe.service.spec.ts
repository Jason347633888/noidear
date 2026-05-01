import { BadRequestException } from '@nestjs/common';
import { RecipeService } from './recipe.service';

describe('RecipeService archive behavior', () => {
  it('默认列表只返回产品有效且未归档的配方', async () => {
    const prisma: any = {
      recipe: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new RecipeService(prisma);

    await service.findAll();

    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: {
        company_id: '1',
        status: { in: ['draft', 'active'] },
        product: { deleted_at: null, status: 'active' },
      },
      include: { lines: { include: { material: true } }, product: true },
      orderBy: { created_at: 'desc' },
    });
  });

  it('归档列表返回归档配方或产品已退出正常业务的配方', async () => {
    const prisma: any = {
      recipe: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new RecipeService(prisma);

    await service.findAll(true);

    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: {
        company_id: '1',
        OR: [
          { status: 'archived' },
          { product: { deleted_at: { not: null } } },
          { product: { status: { not: 'active' } } },
        ],
      },
      include: { lines: { include: { material: true } }, product: true },
      orderBy: { created_at: 'desc' },
    });
  });

  it('按产品查询默认只返回该产品的可用配方', async () => {
    const prisma: any = {
      recipe: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new RecipeService(prisma);

    await service.findByProduct('prod-1');

    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: {
        product_id: 'prod-1',
        company_id: '1',
        status: { in: ['draft', 'active'] },
        product: { deleted_at: null, status: 'active' },
      },
      include: { lines: { include: { material: true } }, product: true },
      orderBy: { version: 'desc' },
    });
  });

  it('按产品查询归档视图返回该产品所有配方并带产品信息', async () => {
    const prisma: any = {
      recipe: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new RecipeService(prisma);

    await service.findByProduct('prod-1', true);

    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: {
        product_id: 'prod-1',
        company_id: '1',
      },
      include: { lines: { include: { material: true } }, product: true },
      orderBy: { version: 'desc' },
    });
  });

  it('归档配方时更新状态而不是硬删除', async () => {
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue({ id: 'recipe-1', company_id: '1', lines: [] }),
        update: jest.fn().mockResolvedValue({ id: 'recipe-1', status: 'archived' }),
        delete: jest.fn(),
      },
    };
    const service = new RecipeService(prisma);

    await service.archive('recipe-1');

    expect(prisma.recipe.update).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      data: { status: 'archived' },
    });
    expect(prisma.recipe.delete).not.toHaveBeenCalled();
  });

  it('旧 remove 入口复用归档逻辑', async () => {
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue({ id: 'recipe-1', company_id: '1', lines: [] }),
        update: jest.fn().mockResolvedValue({ id: 'recipe-1', status: 'archived' }),
        delete: jest.fn(),
      },
    };
    const service = new RecipeService(prisma);

    await service.remove('recipe-1');

    expect(prisma.recipe.update).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      data: { status: 'archived' },
    });
    expect(prisma.recipe.delete).not.toHaveBeenCalled();
  });
});

describe('RecipeService create area validation', () => {
  it('rejects recipe lines without an active workshop area', async () => {
    const tx: any = {
      workshopArea: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      recipe: {
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma: any = {
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new RecipeService(prisma);

    await expect(
      service.create({
        product_id: 'prod-1',
        lines: [
          {
            material_id: 'mat-1',
            qty_per_batch: 10,
            unit: 'kg',
            area_id: '',
          },
        ],
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(tx.recipe.create).not.toHaveBeenCalled();
  });

  it('writes area_name_snapshot from the selected workshop area', async () => {
    const tx: any = {
      workshopArea: {
        findFirst: jest.fn().mockResolvedValue({ id: 'area-1', name: '筛粉间' }),
      },
      recipe: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ version: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'recipe-2' }),
      },
    };
    const prisma: any = {
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new RecipeService(prisma);

    await service.create({
      product_id: 'prod-1',
      lines: [
        {
          material_id: 'mat-1',
          qty_per_batch: 10,
          unit: 'kg',
          area_id: 'area-1',
          is_critical: true,
        },
      ],
    });

    expect(tx.workshopArea.findFirst).toHaveBeenCalledWith({
      where: { id: 'area-1', company_id: '1', status: 'active', deleted_at: null },
    });
    expect(tx.recipe.create).toHaveBeenCalledWith({
      data: {
        company_id: '1',
        product_id: 'prod-1',
        version: 2,
        version_note: undefined,
        status: 'active',
        lines: {
          create: [
            {
              material_id: 'mat-1',
              qty_per_batch: 10,
              unit: 'kg',
              area_id: 'area-1',
              is_critical: true,
              area_name_snapshot: '筛粉间',
            },
          ],
        },
      },
      include: { lines: true },
    });
  });
});
