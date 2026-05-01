import { Test, TestingModule } from '@nestjs/testing';
import { ScrapService } from './scrap.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryMovementLedgerService } from './inventory-movement-ledger.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ScrapService', () => {
  let service: ScrapService;
  let prisma: PrismaService;
  let inventoryMovementLedger: InventoryMovementLedgerService;

  const mockPrismaService = {
    materialScrap: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    materialBatch: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stagingAreaStock: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    stockRecord: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: InventoryMovementLedgerService,
          useValue: { recordMaterialBatchMovement: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ScrapService>(ScrapService);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryMovementLedger = module.get<InventoryMovementLedgerService>(InventoryMovementLedgerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      items: [
        { materialBatchId: 'batch-1', quantity: 10 },
      ],
      reason: '质量不合格',
      requesterId: 'user-1',
    };

    it('should create scrap with generated scrapNo', async () => {
      const mockBatch = { id: 'batch-1' };
      const mockScrap = {
        id: 'scrap-1',
        scrapNo: 'SCRAP-20260216-001',
        status: 'draft',
      };

      prisma.materialBatch.findUnique = jest.fn().mockResolvedValue(mockBatch);
      prisma.materialScrap.count = jest.fn().mockResolvedValue(0);
      prisma.materialScrap.create = jest.fn().mockResolvedValue(mockScrap);

      const result = await service.create(createDto);

      expect(result).toEqual(mockScrap);
      expect(prisma.materialScrap.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if batch not found', async () => {
      prisma.materialBatch.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    const approveDto = { approvedBy: 'approver-1' };

    it('should approve draft scrap', async () => {
      const mockScrap = { id: 'scrap-1', status: 'draft' };
      const mockUpdated = { ...mockScrap, status: 'approved' };

      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(mockScrap);
      prisma.materialScrap.update = jest.fn().mockResolvedValue(mockUpdated);

      const result = await service.approve('scrap-1', approveDto);

      expect(result.status).toBe('approved');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.approve('scrap-1', approveDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if not draft', async () => {
      const mockScrap = { id: 'scrap-1', status: 'approved' };
      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(mockScrap);

      await expect(service.approve('scrap-1', approveDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should complete approved scrap', async () => {
      const mockScrap = {
        id: 'scrap-1',
        scrapNo: 'SCRAP-001',
        status: 'approved',
        requesterId: 'user-1',
        items: [
          {
            materialBatchId: 'batch-1',
            quantity: 10,
            materialBatch: { batchNumber: 'B001' },
          },
        ],
      };

      const txClient = {
        stagingAreaStock: {
          findFirst: jest.fn().mockResolvedValue({ id: 's1', quantity: 50 }),
          update: jest.fn().mockResolvedValue({}),
        },
        materialBatch: { update: jest.fn().mockResolvedValue({}) },
        stockRecord: { create: jest.fn().mockResolvedValue({}) },
        materialScrap: { update: jest.fn().mockResolvedValue({ ...mockScrap, status: 'completed' }) },
      };

      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(mockScrap);
      prisma.stagingAreaStock.findFirst = jest.fn().mockResolvedValue({ id: 's1', quantity: 50 });
      prisma.$transaction = jest.fn(async (cb: any) => cb(txClient)) as any;
      jest.spyOn(inventoryMovementLedger, 'recordMaterialBatchMovement').mockResolvedValue({} as any);

      const result = await service.complete('scrap-1');

      expect(result.status).toBe('completed');
      expect(txClient.materialBatch.update).toHaveBeenCalledWith({
        where: { id: 'batch-1' },
        data: { quantity: { decrement: 10 } },
      });
      expect(inventoryMovementLedger.recordMaterialBatchMovement).toHaveBeenCalledWith(
        expect.objectContaining({ movementType: 'scrap', batchId: 'batch-1' }),
        txClient,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.complete('scrap-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if not approved', async () => {
      const mockScrap = { id: 'scrap-1', status: 'draft', items: [] };
      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(mockScrap);

      await expect(service.complete('scrap-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if stock insufficient', async () => {
      const mockScrap = {
        id: 'scrap-1',
        status: 'approved',
        items: [
          {
            materialBatchId: 'batch-1',
            quantity: 100,
            materialBatch: { batchNumber: 'B001' },
          },
        ],
      };

      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(mockScrap);
      prisma.$transaction = jest.fn(async (cb: any) =>
        cb({
          stagingAreaStock: { findFirst: jest.fn().mockResolvedValue({ quantity: 50 }) },
        }),
      ) as any;

      await expect(service.complete('scrap-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should decrement MaterialBatch inventory during complete', async () => {
      const mockScrap = {
        id: 'scrap-1',
        scrapNo: 'SCRAP-20260216-001',
        status: 'approved',
        requesterId: 'user-1',
        items: [
          {
            id: 'item-1',
            materialBatchId: 'batch-1',
            quantity: 10,
            materialBatch: { id: 'batch-1', batchNumber: 'BATCH-001' },
          },
        ],
      };

      const mockStagingStock = {
        id: 'staging-1',
        batchId: 'batch-1',
        quantity: 20,
      };

      const txClient2 = {
        stagingAreaStock: {
          findFirst: jest.fn().mockResolvedValue(mockStagingStock),
          update: jest.fn().mockResolvedValue({}),
        },
        materialBatch: { update: jest.fn().mockResolvedValue({}) },
        stockRecord: { create: jest.fn().mockResolvedValue({}) },
        materialScrap: { update: jest.fn().mockResolvedValue({ ...mockScrap, status: 'completed' }) },
      };

      jest.spyOn(prisma.materialScrap, 'findUnique').mockResolvedValue(mockScrap as any);
      jest.spyOn(prisma.stagingAreaStock, 'findFirst').mockResolvedValue(mockStagingStock as any);
      jest.spyOn(inventoryMovementLedger, 'recordMaterialBatchMovement').mockResolvedValue({} as any);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(txClient2);
      });

      await service.complete('scrap-1');

      expect(txClient2.materialBatch.update).toHaveBeenCalledWith({
        where: { id: 'batch-1' },
        data: { quantity: { decrement: 10 } },
      });
      expect(inventoryMovementLedger.recordMaterialBatchMovement).toHaveBeenCalledWith(
        expect.objectContaining({ movementType: 'scrap', batchId: 'batch-1' }),
        txClient2,
      );
    });
  });

  describe('findAll', () => {
    it('should return all scraps with relations', async () => {
      const mockScraps = [{ id: 'scrap-1', items: [] }];
      prisma.materialScrap.findMany = jest.fn().mockResolvedValue(mockScraps);

      const result = await service.findAll();

      expect(result).toEqual(mockScraps);
    });
  });

  describe('findOne', () => {
    it('should return scrap with relations', async () => {
      const mockScrap = { id: 'scrap-1', items: [] };
      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(mockScrap);

      const result = await service.findOne('scrap-1');

      expect(result).toEqual(mockScrap);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.materialScrap.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('scrap-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateScrapNumber', () => {
    it('should generate SCRAP-YYYYMMDD-XXX format', async () => {
      prisma.materialScrap.count = jest.fn().mockResolvedValue(5);

      const scrapNo = await service['generateScrapNumber']();

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      expect(scrapNo).toBe(`SCRAP-${today}-006`);
    });
  });
});
