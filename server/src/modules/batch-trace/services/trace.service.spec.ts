import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { TraceService } from './trace.service';

// TASK-9: FinishedGoodsBatch removed — tests updated to use ProductionBatch directly
describe('TraceService', () => {
  let service: TraceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraceService,
        {
          provide: PrismaService,
          useValue: {
            productionBatch: {
              findUnique: jest.fn(),
            },
            materialBatch: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TraceService>(TraceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('backwardTrace', () => {
    it('should trace production batch to raw materials', async () => {
      const mockProductionBatch = {
        id: 'prod-001',
        batchNumber: 'PROD-001',
        materialUsages: [
          {
            materialBatch: {
              id: 'mat-001',
              batchNumber: 'MAT-001',
              material: { name: '面粉' },
              supplier: { name: '供应商A' },
            },
            quantity: 50,
          },
        ],
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);

      const result = await service.backwardTrace('prod-001');

      expect(result.productionBatch.batchNumber).toBe('PROD-001');
      expect(result.rawMaterials).toHaveLength(1);
      expect(result.rawMaterials[0].batchNumber).toBe('MAT-001');
    });

    it('should throw error if production batch not found', async () => {
      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.backwardTrace('prod-999')).rejects.toThrow('产品批次不存在');
    });
  });

  describe('forwardTrace', () => {
    it('should trace raw material to production batches', async () => {
      const mockUsages = [
        {
          productionBatch: {
            id: 'prod-001',
            batchNumber: 'PROD-001',
          },
          quantity: 50,
        },
      ];

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([
        {
          batchMaterialUsages: mockUsages,
        },
      ] as any);

      const result = await service.forwardTrace('mat-001');

      expect(result.productionBatches).toHaveLength(1);
      expect(result.productionBatches[0].batchNumber).toBe('PROD-001');
    });
  });
});
