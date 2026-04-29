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
      include: { lines: true, product: true },
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
      include: { lines: true, product: true },
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
      include: { lines: true, product: true },
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
      include: { lines: true, product: true },
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
