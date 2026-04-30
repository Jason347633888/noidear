import { Test } from '@nestjs/testing';
import { MixingService } from './mixing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('MixingService', () => {
  let service: MixingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      stagingAreaStock: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
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
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', lines: [] });

      await service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        workDate: '2026-04-30',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      });

      expect(prisma.stagingAreaStock.update).toHaveBeenCalledWith({
        where: { id: 'stock-1' },
        data: { quantity: { decrement: 50 } },
      });
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
