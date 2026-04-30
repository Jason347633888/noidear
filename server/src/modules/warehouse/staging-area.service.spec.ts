import { Test, TestingModule } from '@nestjs/testing';
import { StagingAreaService } from './staging-area.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { StagingStocktakeKind } from './dto/staging-area.dto';

describe('StagingAreaService', () => {
  let service: StagingAreaService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StagingAreaService,
        {
          provide: PrismaService,
          useValue: {
            stagingAreaStock: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            stagingAreaRecord: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            materialBatch: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StagingAreaService>(StagingAreaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentStock', () => {
    it('should return current staging area stock with pagination', async () => {
      const mockStocks = [
        {
          id: 'stock-1',
          batchId: 'batch-1',
          quantity: 100,
          batch: {
            batchNumber: 'MAT-001',
            material: { name: 'Material A' },
          },
        },
      ];

      jest.spyOn(prisma.stagingAreaStock, 'findMany').mockResolvedValue(mockStocks as any);
      jest.spyOn(prisma.stagingAreaStock, 'count').mockResolvedValue(1);

      const result = await service.getCurrentStock({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockStocks);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('recordInventory', () => {
    it('should create opening inventory record', async () => {
      const recordDto = {
        batchId: 'batch-1',
        quantity: 100,
        recordType: 'opening',
        operatorId: 'user-1',
        shiftDate: new Date('2026-02-16'),
      };

      const mockRecord = {
        id: 'record-1',
        ...recordDto,
        createdAt: new Date(),
      };

      jest.spyOn(prisma.stagingAreaRecord, 'create').mockResolvedValue(mockRecord as any);

      const result = await service.recordInventory(recordDto);

      expect(result).toEqual(mockRecord);
      expect(prisma.stagingAreaRecord.create).toHaveBeenCalledWith({
        data: recordDto,
      });
    });

    it('should create closing inventory record and update stock', async () => {
      const recordDto = {
        batchId: 'batch-1',
        quantity: 95,
        recordType: 'closing',
        operatorId: 'user-1',
        shiftDate: new Date('2026-02-16'),
      };

      const mockStock = {
        id: 'stock-1',
        batchId: 'batch-1',
        quantity: 100,
      };

      const mockRecord = {
        id: 'record-1',
        ...recordDto,
        createdAt: new Date(),
      };

      jest.spyOn(prisma.stagingAreaStock, 'findFirst').mockResolvedValue(mockStock as any);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          stagingAreaRecord: {
            create: jest.fn().mockResolvedValue(mockRecord),
          },
          stagingAreaStock: {
              findFirst: jest.fn(),
            update: jest.fn().mockResolvedValue({ ...mockStock, quantity: 95 }),
          },
        });
      });

      const result = await service.recordInventory(recordDto);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getInventoryHistory', () => {
    it('should return inventory history for a batch', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          batchId: 'batch-1',
          recordType: 'opening',
          quantity: 100,
          shiftDate: new Date(),
          createdAt: new Date(),
        },
      ];

      jest.spyOn(prisma.stagingAreaRecord, 'findMany').mockResolvedValue(mockRecords as any);

      const result = await service.getInventoryHistory('batch-1');

      expect(result).toEqual(mockRecords);
      expect(prisma.stagingAreaRecord.findMany).toHaveBeenCalledWith({
        where: { batchId: 'batch-1' },
        include: { operator: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('listAvailableStocks', () => {
    it('returns FIFO stocks by material and area', async () => {
      jest.spyOn(prisma.stagingAreaStock, 'findMany').mockResolvedValue([]);
      await service.listAvailableStocks({ areaId: 'area-small', materialId: 'mat-sugar' });

      expect(prisma.stagingAreaStock.findMany).toHaveBeenCalledWith({
        where: {
          area_id: 'area-small',
          quantity: { gt: 0 },
          batch: { materialId: 'mat-sugar' },
        },
        include: { batch: true, area: true },
        orderBy: [{ batch: { productionDate: 'asc' } }, { createdAt: 'asc' }],
      });
    });
  });
});

describe('StagingAreaService - confirmStocktake', () => {
  let localService: StagingAreaService;
  let localPrisma: any;

  beforeEach(async () => {
    localPrisma = {
      stagingAreaStock: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      stagingAreaRecord: { create: jest.fn(), findMany: jest.fn() },
      stagingAreaStocktake: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
      materialBatch: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        StagingAreaService,
        { provide: PrismaService, useValue: localPrisma },
      ],
    }).compile();

    localService = mod.get<StagingAreaService>(StagingAreaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('marks stocktake as exception when actual differs from book', async () => {
    localPrisma.stagingAreaStock.findUnique.mockResolvedValue({ id: 'stock-1', quantity: 100 });
    localPrisma.stagingAreaStocktake.create.mockResolvedValue({ status: 'exception', difference: -2 });

    const result = await localService.confirmStocktake({
      areaId: 'area-small',
      batchId: 'mb-1',
      kind: StagingStocktakeKind.shift_end,
      workDate: '2026-04-30',
      shiftTypeId: 'shift-night',
      actualQuantity: 98,
    });

    expect(localPrisma.stagingAreaStocktake.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'exception', difference: -2 }) })
    );
    expect(result).toEqual({ status: 'exception', difference: -2 });
  });

  it('marks stocktake as confirmed when quantities match', async () => {
    localPrisma.stagingAreaStock.findUnique.mockResolvedValue({ id: 'stock-1', quantity: 100 });
    localPrisma.stagingAreaStocktake.create.mockResolvedValue({ status: 'confirmed', difference: 0 });

    await localService.confirmStocktake({
      areaId: 'area-small',
      batchId: 'mb-1',
      kind: StagingStocktakeKind.shift_start,
      workDate: '2026-04-30',
      shiftTypeId: 'shift-day',
      actualQuantity: 100,
    });

    expect(localPrisma.stagingAreaStocktake.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'confirmed', difference: 0 }) })
    );
  });

  it('throws BadRequestException when stock not found', async () => {
    localPrisma.stagingAreaStock.findUnique.mockResolvedValue(null);

    await expect(
      localService.confirmStocktake({
        areaId: 'area-small',
        batchId: 'mb-missing',
        kind: StagingStocktakeKind.handover,
        workDate: '2026-04-30',
        shiftTypeId: 'shift-day',
        actualQuantity: 50,
      })
    ).rejects.toThrow(BadRequestException);
  });
});
