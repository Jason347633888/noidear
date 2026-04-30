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
      prisma.$transaction.mockResolvedValue([{ id: 'agg-1' }]);

      const result = await service.create({
        productionBatchId: 'pb-20260430',
        mixingExecutionIds: ['mix-2330'],
      });

      expect(result).toHaveLength(1);
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
  });

  describe('confirm', () => {
    it('throws when no aggregations exist for the batch', async () => {
      prisma.batchMixingAggregation.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.confirm({
          productionBatchId: 'pb-1',
          confirmedBy: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
