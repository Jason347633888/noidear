import { Test } from '@nestjs/testing';
import { MixingService } from './mixing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { OwnershipContext } from '../module-access/ownership-context';

describe('MixingService', () => {
  let service: MixingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      stagingAreaStock: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      stagingAreaStocktake: {
        findFirst: jest.fn(),
      },
      shiftType: { findFirst: jest.fn() },
      recipe: { findFirst: jest.fn() },
      recipeLine: { findMany: jest.fn() },
      mixingExecution: { create: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
      mixingExecutionLine: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        MixingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(MixingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('recommendMaterialBatches', () => {
    it('returns FIFO recommendations and shortage', async () => {
      prisma.stagingAreaStock.findMany.mockResolvedValue([
        { id: 'stock-1', batchId: 'mb-old', quantity: 30, batch: { materialId: 'mat-flour' } },
        { id: 'stock-2', batchId: 'mb-new', quantity: 40, batch: { materialId: 'mat-flour' } },
      ]);

      const result = await service.recommendMaterialBatches({
        areaId: 'area-1',
        materialId: 'mat-flour',
        requiredQuantity: 50,
      });

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].quantity).toBe(30);
      expect(result.recommendations[1].quantity).toBe(20);
      expect(result.shortage).toBe(0);
    });

    it('reports shortage when stock is insufficient', async () => {
      prisma.stagingAreaStock.findMany.mockResolvedValue([
        { id: 'stock-1', batchId: 'mb-1', quantity: 20, batch: { materialId: 'mat-flour' } },
      ]);

      const result = await service.recommendMaterialBatches({
        areaId: 'area-1',
        materialId: 'mat-flour',
        requiredQuantity: 50,
      });

      expect(result.shortage).toBe(30);
    });
  });

  describe('createExecution', () => {
    it('deducts stock and creates execution lines', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 1 });
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', lines: [] });

      await service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        workDate: '2026-04-30',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      });

      expect(prisma.stagingAreaStock.updateMany).toHaveBeenCalledWith({
        where: { id: 'stock-1', quantity: { gte: 50 } },
        data: { quantity: { decrement: 50 } },
      });
    });

    it('validates and persists shiftTypeId when provided', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true, name: '白班' });
      prisma.stagingAreaStocktake.findFirst.mockResolvedValue({ id: 'stocktake-1' });
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 1 });
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', shift_type_id: 'shift-day', lines: [] });

      await service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        shiftTypeId: 'shift-day',
        workDate: '2026-05-02',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      });

      expect(prisma.shiftType.findFirst).toHaveBeenCalledWith({
        where: { id: 'shift-day', active: true },
        select: { id: true },
      });
      expect(prisma.mixingExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shift_type_id: 'shift-day',
        }),
      });
    });

    it('rejects invalid shiftTypeId before decrementing staging stock', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue(null);

      await expect(service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        shiftTypeId: 'missing-shift',
        workDate: '2026-05-02',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      })).rejects.toThrow(BadRequestException);

      expect(prisma.recipeLine.findMany).not.toHaveBeenCalled();
      expect(prisma.stagingAreaStock.updateMany).not.toHaveBeenCalled();
      expect(prisma.mixingExecution.create).not.toHaveBeenCalled();
    });

    it('allows execution when shift-start stocktake is confirmed', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true });
      prisma.stagingAreaStocktake.findFirst.mockResolvedValue({
        id: 'stocktake-1',
        status: 'confirmed',
        kind: 'shift_start',
      });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 1 });
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', shift_type_id: 'shift-day', lines: [] });

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          shiftTypeId: 'shift-day',
          workDate: '2026-05-03',
          actualWeight: 50,
          lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
        }),
      ).resolves.toBeDefined();

      expect(prisma.stagingAreaStocktake.findFirst).toHaveBeenCalledWith({
        where: {
          area_id: 'area-small',
          batchId: 'mb-old',
          kind: 'shift_start',
          work_date: expect.any(Date),
          shift_type_id: 'shift-day',
          status: { in: ['confirmed', 'exception'] },
        },
        select: { id: true },
      });
    });

    it('allows execution when shift-start stocktake is exception (discrepancy logged)', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true });
      prisma.stagingAreaStocktake.findFirst.mockResolvedValue({
        id: 'stocktake-1',
        status: 'exception',
        kind: 'shift_start',
      });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 1 });
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', lines: [] });

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          shiftTypeId: 'shift-day',
          workDate: '2026-05-03',
          actualWeight: 50,
          lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
        }),
      ).resolves.toBeDefined();
    });

    it('blocks execution when shift-start stocktake is missing for a batch', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true });
      prisma.stagingAreaStocktake.findFirst.mockResolvedValue(null);

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          shiftTypeId: 'shift-day',
          workDate: '2026-05-03',
          actualWeight: 50,
          lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-missing', actualQuantity: 50, manualOverride: false }],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.recipeLine.findMany).not.toHaveBeenCalled();
      expect(prisma.stagingAreaStock.updateMany).not.toHaveBeenCalled();
      expect(prisma.mixingExecution.create).not.toHaveBeenCalled();
    });

    it('skips stocktake validation when shiftTypeId is not provided', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 1 });
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', lines: [] });

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          workDate: '2026-05-03',
          actualWeight: 50,
          lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
        }),
      ).resolves.toBeDefined();

      expect(prisma.stagingAreaStocktake.findFirst).not.toHaveBeenCalled();
    });

    it('blocks when one of multiple batches is missing a shift-start stocktake', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true });
      prisma.stagingAreaStocktake.findFirst
        .mockResolvedValueOnce({ id: 'stocktake-1', status: 'confirmed' })
        .mockResolvedValueOnce(null);

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          shiftTypeId: 'shift-day',
          workDate: '2026-05-03',
          actualWeight: 100,
          lines: [
            { recipeLineId: 'line-flour', materialBatchId: 'mb-1', actualQuantity: 50, manualOverride: false },
            { recipeLineId: 'line-sugar', materialBatchId: 'mb-2', actualQuantity: 50, manualOverride: false },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.mixingExecution.create).not.toHaveBeenCalled();
    });

    it('rejects when the conditional decrement matches zero rows (concurrent overdraw)', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      // Another concurrent transaction already decremented this stock.
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        workDate: '2026-04-30',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when recipe does not match product', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue(null); // recipe not found / not active / wrong product

      await expect(service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-wrong',
        areaId: 'area-small',
        workDate: '2026-04-30',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when recipe line not found', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.recipeLine.findMany.mockResolvedValue([]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });

      await expect(service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        workDate: '2026-04-30',
        actualWeight: 50,
        lines: [{ recipeLineId: 'bad-line', materialBatchId: 'mb-1', actualQuantity: 10, manualOverride: false }],
      })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when stock insufficient', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue(null);

      await expect(service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        workDate: '2026-04-30',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      })).rejects.toThrow(BadRequestException);
    });
  });
});

describe('MixingService.listForOwnership', () => {
  function freshSvc(memberIds: string[] = []) {
    const prisma: any = {
      mixingExecution: { findMany: jest.fn().mockResolvedValue([]) },
      stagingAreaStock: { findMany: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
    };
    return { svc: new MixingService(prisma), prisma };
  }

  beforeEach(() => jest.clearAllMocks());

  it('admin sees all executions (no operatorId filter)', async () => {
    const { svc, prisma } = freshSvc();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.mixingExecution.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('operatorId');
  });

  it('user sees only executions where operatorId = userId', async () => {
    const { svc, prisma } = freshSvc();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.mixingExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { operatorId: 'u-1' } }),
    );
  });

  it('leader sees executions where operatorId IN managed-dept members', async () => {
    const { svc, prisma } = freshSvc(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.mixingExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { operatorId: { in: ['m-1', 'm-2'] } } }),
    );
  });
});
