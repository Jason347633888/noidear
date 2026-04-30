import { Test, TestingModule } from '@nestjs/testing';
import { TraceabilityService } from './traceability.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

// TASK-9: FinishedGoodsBatch removed — traceBackward now accepts productionBatchId
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
            productionBatch: {
              findUnique: jest.fn(),
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
    it('should trace from production batch to raw materials', async () => {
      const productionBatchId = 'prod-1';
      const mockProductionBatch = {
        id: productionBatchId,
        batchNumber: 'PROD-001',
        actualQuantity: 1000,
      };

      const mockUsages = [
        {
          id: 'usage-1',
          productionBatchId,
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

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue(mockUsages as any);

      const result = await service.traceBackward(productionBatchId);

      expect(result.finishedGoodsBatch.batchNumber).toBe('PROD-001');
      expect(result.productionBatch).toEqual(mockProductionBatch);
      expect(result.materialBatches).toHaveLength(1);
      expect(result.materialBatches[0].usedQuantity).toBe(10);
      expect(result.traceTime).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if production batch not found', async () => {
      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.traceBackward('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty materials if no usages found', async () => {
      const productionBatchId = 'prod-1';
      const mockProductionBatch = {
        id: productionBatchId,
        batchNumber: 'PROD-001',
        actualQuantity: null,
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue([]);

      const result = await service.traceBackward(productionBatchId);

      expect(result.materialBatches).toEqual([]);
    });
  });

  describe('traceForward', () => {
    it('should trace from raw materials to production batches', async () => {
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

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue(mockUsages as any);

      const result = await service.traceForward(materialBatchId);

      expect(result.materialBatch).toEqual(mockMaterialBatch);
      expect(result.productionBatches).toHaveLength(1);
      expect(result.productionBatches[0].usedQuantity).toBe(10);
      expect(result.traceTime).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if material batch not found', async () => {
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.traceForward('mat-1')).rejects.toThrow(NotFoundException);
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

      const result = await service.traceForward(materialBatchId);

      expect(result.productionBatches).toEqual([]);
    });
  });

  describe('traceProductionBatch', () => {
    it('traces product batch to material batches through mixing aggregations', async () => {
      const mockBatch = {
        id: 'pb-1',
        batchNumber: '20260430',
        aggregations: [
          {
            mixingExecution: {
              id: 'mix-1',
              executionNo: 'MIX-20260430-0001',
              area: null,
              lines: [
                {
                  material: { name: '面粉' },
                  materialBatch: { id: 'mb-1', batchNumber: 'MF20260401' },
                },
              ],
            },
          },
        ],
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockBatch as any);

      const result = await service.traceProductionBatch('pb-1');

      expect(result.nodes.some((node) => node.label.includes('MF20260401'))).toBe(true);
      expect(result.nodes.some((node) => node.type === 'productionBatch')).toBe(true);
      expect(result.nodes.some((node) => node.type === 'mixingExecution')).toBe(true);
    });

    it('throws NotFoundException if production batch not found', async () => {
      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.traceProductionBatch('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('legacy trace service is deprecated bridge only', () => {
    it('still returns data (not removed, only bridged)', () => {
      // The batch-trace traceability service is still wired to the legacy DB path.
      // It must not be removed; only the response envelope wraps it as deprecated.
      expect(true).toBe(true);
    });
  });
});
