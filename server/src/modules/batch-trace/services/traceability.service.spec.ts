import { Test, TestingModule } from '@nestjs/testing';
import { TraceabilityService } from './traceability.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TraceabilityService', () => {
  let service: TraceabilityService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraceabilityService,
        {
          provide: PrismaService,
          useValue: {
            finishedGoodsBatch: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            materialBatch: {
              findUnique: jest.fn(),
            },
            batchMaterialUsage: {
              findMany: jest.fn(),
            },
            record: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TraceabilityService>(TraceabilityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('traceBackward', () => {
    it('should trace from finished goods to raw materials', async () => {
      const finishedBatchId = 'finished-1';
      const mockFinishedBatch = {
        id: finishedBatchId,
        batchNumber: 'FG-001',
        productionBatchId: 'prod-1',
        productionBatch: {
          id: 'prod-1',
          batchNumber: 'PROD-001',
        },
      };

      const mockUsages = [
        {
          id: 'usage-1',
          productionBatchId: 'prod-1',
          materialBatchId: 'mat-1',
          quantity: 10,
          usedAt: new Date(),
          materialBatch: {
            id: 'mat-1',
            batchNumber: 'MAT-001',
            material: { id: '1', name: '面粉' },
            supplier: { id: '1', name: '供应商A' },
          },
        },
      ];

      jest.spyOn(prisma.finishedGoodsBatch, 'findUnique').mockResolvedValue(mockFinishedBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue(mockUsages as any);

      const result = await service.traceBackward(finishedBatchId);

      expect(result.finishedGoodsBatch).toEqual(mockFinishedBatch);
      expect(result.productionBatch).toEqual(mockFinishedBatch.productionBatch);
      expect(result.materialBatches).toHaveLength(1);
      expect(result.materialBatches[0].usedQuantity).toBe(10);
      expect(result.traceTime).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if finished batch not found', async () => {
      const finishedBatchId = 'finished-1';

      jest.spyOn(prisma.finishedGoodsBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.traceBackward(finishedBatchId)).rejects.toThrow(NotFoundException);
    });

    it('should return empty materials if no usages found', async () => {
      const finishedBatchId = 'finished-1';
      const mockFinishedBatch = {
        id: finishedBatchId,
        batchNumber: 'FG-001',
        productionBatchId: 'prod-1',
        productionBatch: {
          id: 'prod-1',
          batchNumber: 'PROD-001',
        },
      };

      jest.spyOn(prisma.finishedGoodsBatch, 'findUnique').mockResolvedValue(mockFinishedBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue([]);

      const result = await service.traceBackward(finishedBatchId);

      expect(result.materialBatches).toEqual([]);
    });
  });

  describe('traceForward', () => {
    it('should trace from raw materials to finished goods', async () => {
      const materialBatchId = 'mat-1';
      const mockMaterialBatch = {
        id: materialBatchId,
        batchNumber: 'MAT-001',
        material: { id: '1', name: '面粉' },
        supplier: { id: '1', name: '供应商A' },
      };

      const mockUsages = [
        {
          id: 'usage-1',
          productionBatchId: 'prod-1',
          materialBatchId,
          quantity: 10,
          usedAt: new Date(),
          productionBatch: {
            id: 'prod-1',
            batchNumber: 'PROD-001',
            status: 'completed',
            productionDate: new Date(),
          },
        },
      ];

      const mockFinishedGoods = [
        { id: 'finished-1', batchNumber: 'FG-001', productionBatchId: 'prod-1' },
      ];

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue(mockUsages as any);
      jest.spyOn(prisma.finishedGoodsBatch, 'findMany').mockResolvedValue(mockFinishedGoods as any);

      const result = await service.traceForward(materialBatchId);

      expect(result.materialBatch).toEqual(mockMaterialBatch);
      expect(result.productionBatches).toHaveLength(1);
      expect(result.productionBatches[0].usedQuantity).toBe(10);
      expect(result.productionBatches[0].finishedGoods).toHaveLength(1);
      expect(result.traceTime).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if material batch not found', async () => {
      const materialBatchId = 'mat-1';

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.traceForward(materialBatchId)).rejects.toThrow(NotFoundException);
    });

    it('should return empty production batches if no usages found', async () => {
      const materialBatchId = 'mat-1';
      const mockMaterialBatch = {
        id: materialBatchId,
        batchNumber: 'MAT-001',
        material: { id: '1', name: '面粉' },
        supplier: { id: '1', name: '供应商A' },
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.finishedGoodsBatch, 'findMany').mockResolvedValue([]);

      const result = await service.traceForward(materialBatchId);

      expect(result.productionBatches).toEqual([]);
    });
  });
});
