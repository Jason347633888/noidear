import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BatchMixingAggregationService } from './batch-mixing-aggregation.service';

describe('BatchMixingAggregationService', () => {
  let service: BatchMixingAggregationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      productionBatch: { findUnique: jest.fn() },
      mixingExecution: { findMany: jest.fn() },
      batchMixingAggregation: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        upsert: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        BatchMixingAggregationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(BatchMixingAggregationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('allows one night shift to aggregate different executions into two product batches', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'pb-20260430',
        productId: 'product-1',
        recipeId: 'recipe-1',
      });
      prisma.mixingExecution.findMany.mockResolvedValue([
        { id: 'mix-2330', productId: 'product-1', recipeId: 'recipe-1', status: 'confirmed' },
      ]);
      prisma.batchMixingAggregation.findMany.mockResolvedValue([]);
      prisma.$transaction.mockResolvedValue([{ id: 'agg-1' }]);

      const result = await service.create({
        productionBatchId: 'pb-20260430',
        mixingExecutionIds: ['mix-2330'],
      });

      expect(result).toHaveLength(1);
    });

    it('allows one confirmed execution to be aggregated to another matching product batch', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'pb-new',
        productId: 'product-1',
        recipeId: 'recipe-1',
      });
      prisma.mixingExecution.findMany.mockResolvedValue([
        { id: 'mix-1', productId: 'product-1', recipeId: 'recipe-1', status: 'confirmed' },
      ]);
      prisma.$transaction.mockResolvedValue([{ id: 'agg-new', productionBatchId: 'pb-new', mixingExecutionId: 'mix-1' }]);

      const result = await service.create({
        productionBatchId: 'pb-new',
        mixingExecutionIds: ['mix-1'],
      });

      expect(result).toHaveLength(1);
      expect(prisma.batchMixingAggregation.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mixingExecutionId: expect.anything() }),
        }),
      );
    });

    it('upserts the same production batch and execution pair instead of creating duplicates', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'pb-1',
        productId: 'product-1',
        recipeId: 'recipe-1',
      });
      prisma.mixingExecution.findMany.mockResolvedValue([
        { id: 'mix-1', productId: 'product-1', recipeId: 'recipe-1', status: 'confirmed' },
      ]);
      prisma.$transaction.mockResolvedValue([{ id: 'agg-existing', productionBatchId: 'pb-1', mixingExecutionId: 'mix-1' }]);

      await service.create({
        productionBatchId: 'pb-1',
        mixingExecutionIds: ['mix-1'],
        note: 'reuse same pair',
      });

      expect(prisma.batchMixingAggregation.upsert).toHaveBeenCalledWith({
        where: {
          productionBatchId_mixingExecutionId: {
            productionBatchId: 'pb-1',
            mixingExecutionId: 'mix-1',
          },
        },
        create: {
          productionBatchId: 'pb-1',
          mixingExecutionId: 'mix-1',
          status: 'draft',
          note: 'reuse same pair',
        },
        update: {
          note: 'reuse same pair',
        },
      });
    });

    it('throws when execution product or recipe does not match batch', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'pb-1',
        productId: 'product-1',
        recipeId: 'recipe-1',
      });
      prisma.mixingExecution.findMany.mockResolvedValue([
        { id: 'mix-1', productId: 'product-2', recipeId: 'recipe-1', status: 'confirmed' },
      ]);

      await expect(
        service.create({
          productionBatchId: 'pb-1',
          mixingExecutionIds: ['mix-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when executions are not all confirmed', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({ id: 'pb-1', productId: 'p1', recipeId: 'r1' });
      prisma.mixingExecution.findMany.mockResolvedValue([]); // none found

      await expect(
        service.create({
          productionBatchId: 'pb-1',
          mixingExecutionIds: ['mix-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when productionBatch does not exist', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue(null);

      await expect(service.create({
        productionBatchId: 'missing',
        mixingExecutionIds: ['mix-1'],
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('throws when no aggregations exist at all for the batch', async () => {
      prisma.batchMixingAggregation.count.mockResolvedValue(0);

      await expect(
        service.confirm({ productionBatchId: 'pb-1', confirmedBy: 'user-1' }),
      ).rejects.toThrow('产品批次尚未归集配料执行');
    });

    it('throws when all aggregations are already confirmed', async () => {
      prisma.batchMixingAggregation.count.mockResolvedValue(2);
      prisma.batchMixingAggregation.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.confirm({ productionBatchId: 'pb-1', confirmedBy: 'user-1' }),
      ).rejects.toThrow('归集已全部确认，无需重复操作');
    });

    it('only updates draft aggregations and returns all aggregations', async () => {
      prisma.batchMixingAggregation.count.mockResolvedValue(2);
      prisma.batchMixingAggregation.updateMany.mockResolvedValue({ count: 2 });
      prisma.batchMixingAggregation.findMany.mockResolvedValue([
        { id: 'agg-1', mixingExecution: { lines: [] } },
        { id: 'agg-2', mixingExecution: { lines: [] } },
      ]);

      const result = await service.confirm({ productionBatchId: 'pb-1', confirmedBy: 'user-1' });

      expect(prisma.batchMixingAggregation.updateMany).toHaveBeenCalledWith({
        where: { productionBatchId: 'pb-1', status: 'draft' },
        data: expect.objectContaining({ status: 'confirmed', confirmedBy: 'user-1' }),
      });
      expect(result).toHaveLength(2);
    });
  });
});
