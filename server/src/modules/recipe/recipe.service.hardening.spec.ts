import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecipeService } from './recipe.service';

// ─── activateRecipe ───────────────────────────────────────────────────────────

describe('RecipeService — activateRecipe', () => {
  it('marks target recipe active and retires all other active recipes for the same product in one transaction', async () => {
    const target = { id: 'recipe-2', product_id: 'prod-1', company_id: '1', status: 'draft', lines: [] };
    const tx: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(target),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ ...target, status: 'active' }),
      },
    };
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(target),
      },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new RecipeService(prisma);

    const result = await service.activateRecipe('recipe-2');

    expect(tx.recipe.updateMany).toHaveBeenCalledWith({
      where: {
        product_id: 'prod-1',
        company_id: '1',
        status: 'active',
        id: { not: 'recipe-2' },
      },
      data: { status: 'retired' },
    });
    expect(tx.recipe.update).toHaveBeenCalledWith({
      where: { id: 'recipe-2' },
      data: { status: 'active' },
    });
    expect(result).toMatchObject({ id: 'recipe-2', status: 'active' });
  });

  it('throws NotFoundException when recipe does not exist', async () => {
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };
    const service = new RecipeService(prisma);

    await expect(service.activateRecipe('missing-id')).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('only one active recipe exists per product after activation', async () => {
    const target = { id: 'recipe-3', product_id: 'prod-2', company_id: '1', status: 'draft', lines: [] };
    const tx: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(target),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        update: jest.fn().mockResolvedValue({ ...target, status: 'active' }),
      },
    };
    const prisma: any = {
      recipe: { findFirst: jest.fn().mockResolvedValue(target) },
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new RecipeService(prisma);

    await service.activateRecipe('recipe-3');

    // retired count = 2 means two previously-active recipes were retired
    expect(tx.recipe.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'retired' } }),
    );
  });
});

// ─── updateRecipeLine ─────────────────────────────────────────────────────────

describe('RecipeService — updateRecipeLine', () => {
  it('throws BadRequestException when changeEventId is missing', async () => {
    const prisma: any = {};
    const service = new RecipeService(prisma);

    await expect(
      service.updateRecipeLine('line-1', { qty_per_batch: 5, unit: 'kg' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when changeEventId is empty string', async () => {
    const prisma: any = {};
    const service = new RecipeService(prisma);

    await expect(
      service.updateRecipeLine('line-1', { qty_per_batch: 5, unit: 'kg', changeEventId: '' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates recipe line when changeEventId is provided', async () => {
    const existing = {
      id: 'line-1',
      recipe_id: 'recipe-1',
      material_id: 'mat-1',
      qty_per_batch: 10,
      unit: 'kg',
      is_critical: false,
      notes: null,
    };
    const prisma: any = {
      recipeLine: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({ ...existing, qty_per_batch: 5 }),
      },
    };
    const service = new RecipeService(prisma);

    const result = await service.updateRecipeLine('line-1', {
      qty_per_batch: 5,
      unit: 'kg',
      changeEventId: 'ce-abc',
    } as any);

    expect(prisma.recipeLine.update).toHaveBeenCalledWith({
      where: { id: 'line-1' },
      data: expect.objectContaining({ qty_per_batch: 5, unit: 'kg' }),
    });
    expect(result).toMatchObject({ qty_per_batch: 5 });
  });

  it('throws NotFoundException when recipe line does not exist', async () => {
    const prisma: any = {
      recipeLine: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new RecipeService(prisma);

    await expect(
      service.updateRecipeLine('ghost-line', { qty_per_batch: 5, unit: 'kg', changeEventId: 'ce-1' } as any),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── Production planning active-only guard ────────────────────────────────────

describe('RecipeService — getActiveRecipeForProduct', () => {
  it('returns the single active recipe for a product', async () => {
    const active = { id: 'recipe-1', product_id: 'prod-1', status: 'active' };
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(active),
      },
    };
    const service = new RecipeService(prisma);

    const result = await service.getActiveRecipeForProduct('prod-1');

    expect(prisma.recipe.findFirst).toHaveBeenCalledWith({
      where: { product_id: 'prod-1', company_id: '1', status: 'active' },
      include: { lines: { include: { material: true } }, product: true },
    });
    expect(result).toEqual(active);
  });

  it('throws NotFoundException when no active recipe exists for the product', async () => {
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new RecipeService(prisma);

    await expect(service.getActiveRecipeForProduct('prod-no-active')).rejects.toThrow(NotFoundException);
  });
});

// ─── Allergen summary guard ───────────────────────────────────────────────────

describe('RecipeService — getAllergenMaterialsForProduct', () => {
  it('returns allergen materials only from the active recipe', async () => {
    const active = {
      id: 'recipe-1',
      product_id: 'prod-1',
      status: 'active',
      lines: [
        { id: 'l-1', material: { id: 'mat-1', allergens: ['gluten'], name: '小麦粉' } },
        { id: 'l-2', material: { id: 'mat-2', allergens: [], name: '水' } },
      ],
    };
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(active),
      },
    };
    const service = new RecipeService(prisma);

    const result = await service.getAllergenMaterialsForProduct('prod-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'mat-1' });
  });

  it('returns empty array when active recipe has no allergen materials', async () => {
    const active = {
      id: 'recipe-1',
      product_id: 'prod-1',
      status: 'active',
      lines: [
        { id: 'l-1', material: { id: 'mat-2', allergens: [], name: '水' } },
      ],
    };
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(active),
      },
    };
    const service = new RecipeService(prisma);

    const result = await service.getAllergenMaterialsForProduct('prod-1');

    expect(result).toHaveLength(0);
  });

  it('throws NotFoundException when no active recipe exists', async () => {
    const prisma: any = {
      recipe: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new RecipeService(prisma);

    await expect(service.getAllergenMaterialsForProduct('prod-no-active')).rejects.toThrow(NotFoundException);
  });
});
