import { Test, TestingModule } from '@nestjs/testing';
import { MaterialBalanceService } from './material-balance.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MaterialBalanceService', () => {
  let service: MaterialBalanceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialBalanceService,
        {
          provide: PrismaService,
          useValue: {
            materialBatch: {
              findMany: jest.fn(),
            },
            stockRecord: {
              findMany: jest.fn(),
            },
            batchMaterialUsage: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MaterialBalanceService>(MaterialBalanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkBalance', () => {
    it('should calculate material balance correctly', async () => {
      const batchId = 'batch-1';

      const mockStockRecords = [
        { recordType: 'in', quantity: 100 },
        { recordType: 'out', quantity: 30 },
        { recordType: 'out', quantity: 20 },
      ];

      const mockUsages = [
        { quantity: 40 },
      ];

      const mockBatch = {
        id: batchId,
        quantity: 10,
      };

      jest.spyOn(prisma.stockRecord, 'findMany').mockResolvedValue(mockStockRecords as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue(mockUsages as any);
      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([mockBatch] as any);

      const result = await service.checkBalance(batchId);

      expect(result.totalIn).toBe(100);
      expect(result.totalOut).toBe(50);
      expect(result.usedInProduction).toBe(40);
      expect(result.currentStock).toBe(10);
      expect(result.calculated).toBe(10);
      expect(result.isBalanced).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should detect imbalance', async () => {
      const batchId = 'batch-1';

      const mockStockRecords = [
        { recordType: 'in', quantity: 100 },
        { recordType: 'out', quantity: 30 },
      ];

      const mockUsages = [
        { quantity: 40 },
      ];

      const mockBatch = {
        id: batchId,
        quantity: 25,
      };

      jest.spyOn(prisma.stockRecord, 'findMany').mockResolvedValue(mockStockRecords as any);
      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue(mockUsages as any);
      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([mockBatch] as any);

      const result = await service.checkBalance(batchId);

      expect(result.calculated).toBe(30);
      expect(result.currentStock).toBe(25);
      expect(result.isBalanced).toBe(false);
      expect(result.difference).toBe(5);
    });
  });

  describe('checkAllBatches', () => {
    it('should check balance for all batches', async () => {
      const mockBatches = [
        { id: 'batch-1', batchNumber: 'B001' },
        { id: 'batch-2', batchNumber: 'B002' },
      ];

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue(mockBatches as any);
      jest.spyOn(service, 'checkBalance')
        .mockResolvedValueOnce({ batchId: 'batch-1', isBalanced: true } as any)
        .mockResolvedValueOnce({ batchId: 'batch-2', isBalanced: false, difference: 5 } as any);

      const result = await service.checkAllBatches();

      expect(result.total).toBe(2);
      expect(result.balanced).toBe(1);
      expect(result.imbalanced).toBe(1);
      expect(result.batches).toHaveLength(2);
    });
  });
});
