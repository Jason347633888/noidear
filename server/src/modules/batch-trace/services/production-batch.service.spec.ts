import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductionBatchService } from './production-batch.service';
import { BatchNumberGeneratorService } from './batch-number-generator.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProductionBatchService', () => {
  let service: ProductionBatchService;
  let prisma: PrismaService;
  let batchNumberGenerator: BatchNumberGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionBatchService,
        {
          provide: PrismaService,
          useValue: {
            productionBatch: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: BatchNumberGeneratorService,
          useValue: {
            generateBatchNumber: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductionBatchService>(ProductionBatchService);
    prisma = module.get<PrismaService>(PrismaService);
    batchNumberGenerator = module.get<BatchNumberGeneratorService>(BatchNumberGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create production batch with auto-generated batch number', async () => {
      const createDto = {
        productName: '蛋糕',
        plannedQuantity: 100,
        productionDate: new Date('2026-02-15'),
      };

      jest.spyOn(batchNumberGenerator, 'generateBatchNumber').mockResolvedValue('PROD-20260215-001');

      const mockBatch = {
        id: 'batch-001',
        batchNumber: 'PROD-20260215-001',
        ...createDto,
        status: 'pending',
      };

      jest.spyOn(prisma.productionBatch, 'create').mockResolvedValue(mockBatch as any);

      const result = await service.create(createDto);

      expect(result.batchNumber).toBe('PROD-20260215-001');
      expect(batchNumberGenerator.generateBatchNumber).toHaveBeenCalledWith('production');
    });
  });

  describe('findAll', () => {
    it('should return paginated production batches', async () => {
      const query = { page: 1, limit: 10 };

      const mockBatches = [
        {
          id: 'batch-001',
          batchNumber: 'PROD-001',
          status: 'pending',
        },
      ];

      jest.spyOn(prisma.productionBatch, 'findMany').mockResolvedValue(mockBatches as any);
      jest.spyOn(prisma.productionBatch, 'count').mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: mockBatches,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should filter by status', async () => {
      const query = {
        page: 1,
        limit: 10,
        status: 'completed',
      };

      jest.spyOn(prisma.productionBatch, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.productionBatch, 'count').mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.productionBatch.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: 'completed',
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return production batch by id', async () => {
      const mockBatch = {
        id: 'batch-001',
        batchNumber: 'PROD-001',
        deletedAt: null,
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockBatch as any);

      const result = await service.findOne('batch-001');

      expect(result).toEqual(mockBatch);
    });

    it('should throw NotFoundException if not found', async () => {
      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update production batch', async () => {
      const updateDto = {
        actualQuantity: 95,
      };

      const mockBatch = {
        id: 'batch-001',
        deletedAt: null,
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockBatch as any);
      jest.spyOn(prisma.productionBatch, 'update').mockResolvedValue({
        ...mockBatch,
        ...updateDto,
      } as any);

      const result = await service.update('batch-001', updateDto);

      expect(result.actualQuantity).toBe(95);
    });

    it('should not allow updating batchNumber (BR-242)', async () => {
      const updateDto = {
        batchNumber: 'NEW-BATCH-001',
      };

      const mockBatch = {
        id: 'batch-001',
        deletedAt: null,
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockBatch as any);

      await expect(service.update('batch-001', updateDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
