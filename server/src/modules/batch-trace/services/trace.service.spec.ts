import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { TraceService } from './trace.service';

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
            finishedGoodsBatch: {
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
    it('should trace finished goods to raw materials', async () => {
      const mockFinishedGoods = {
        id: 'fg-001',
        batchNumber: 'FG-001',
        productionBatch: {
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
        },
      };

      jest.spyOn(prisma.finishedGoodsBatch, 'findUnique').mockResolvedValue(mockFinishedGoods as any);

      const result = await service.backwardTrace('fg-001');

      expect(result.finishedGoods.batchNumber).toBe('FG-001');
      expect(result.productionBatch.batchNumber).toBe('PROD-001');
      expect(result.rawMaterials).toHaveLength(1);
      expect(result.rawMaterials[0].batchNumber).toBe('MAT-001');
    });
  });

  describe('forwardTrace', () => {
    it('should trace raw material to finished goods', async () => {
      const mockUsages = [
        {
          productionBatch: {
            id: 'prod-001',
            batchNumber: 'PROD-001',
            finishedGoods: [
              {
                id: 'fg-001',
                batchNumber: 'FG-001',
                shippedTo: '客户A',
              },
            ],
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
      expect(result.finishedGoods).toHaveLength(1);
      expect(result.finishedGoods[0].batchNumber).toBe('FG-001');
    });
  });
});
