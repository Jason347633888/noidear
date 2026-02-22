import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchService } from './batch.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as dayjs from 'dayjs';

describe('BatchService', () => {
  let service: BatchService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchService,
        {
          provide: PrismaService,
          useValue: {
            materialBatch: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BatchService>(BatchService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create batch successfully', async () => {
      // Arrange
      const createDto = {
        batchNumber: 'BATCH-20260215-001',
        materialId: 'material-001',
        productionDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-07-01'),
        quantity: 100,
        supplierId: 'supplier-001',
        supplierBatchNo: 'SUP-001',
      };

      const mockBatch = {
        id: 'batch-001',
        ...createDto,
        status: 'normal',
        createdAt: new Date(),
      };

      jest.spyOn(prisma.materialBatch, 'create').mockResolvedValue(mockBatch as any);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockBatch);
    });

    it('should throw BadRequestException if batch number exists', async () => {
      // Arrange
      const createDto = {
        batchNumber: 'BATCH-20260215-001',
        materialId: 'material-001',
        productionDate: new Date(),
        expiryDate: new Date(),
        quantity: 100,
      };

      jest.spyOn(prisma.materialBatch, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['batchNumber'] },
      });

      // Act & Assert
      await expect(service.create(createDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated batches', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };

      const mockBatches = [
        {
          id: 'batch-001',
          batchNumber: 'BATCH-001',
          status: 'normal',
        },
      ];

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue(mockBatches as any);
      jest.spyOn(prisma.materialBatch, 'count').mockResolvedValue(1);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toEqual({
        data: mockBatches,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should filter expired batches', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        status: 'expired',
      };

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.materialBatch, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(query);

      // Assert
      expect(prisma.materialBatch.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: 'expired',
        },
        skip: 0,
        take: 10,
        include: { material: true, supplier: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by material', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        materialId: 'material-001',
      };

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.materialBatch, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(query);

      // Assert
      expect(prisma.materialBatch.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          materialId: 'material-001',
        },
        skip: 0,
        take: 10,
        include: { material: true, supplier: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return batch by id', async () => {
      // Arrange
      const mockBatch = {
        id: 'batch-001',
        batchNumber: 'BATCH-001',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockBatch as any);

      // Act
      const result = await service.findOne('batch-001');

      // Assert
      expect(result).toEqual(mockBatch);
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update batch successfully', async () => {
      // Arrange
      const updateDto = {
        quantity: 150,
        warehouseLocation: 'A-01',
      };

      const mockBatch = {
        id: 'batch-001',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockBatch as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({
        ...mockBatch,
        ...updateDto,
      } as any);

      // Act
      const result = await service.update('batch-001', updateDto);

      // Assert
      expect(result.quantity).toBe(150);
    });

    it('should not allow updating batchNumber (BR-242)', async () => {
      // Arrange
      const updateDto = {
        batchNumber: 'NEW-BATCH-001',
      };

      const mockBatch = {
        id: 'batch-001',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockBatch as any);

      // Act & Assert
      await expect(service.update('batch-001', updateDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('lock', () => {
    it('should lock batch successfully', async () => {
      // Arrange
      const mockBatch = {
        id: 'batch-001',
        status: 'normal',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockBatch as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({
        ...mockBatch,
        status: 'locked',
      } as any);

      // Act
      const result = await service.lock('batch-001');

      // Assert
      expect(result.status).toBe('locked');
    });
  });

  describe('getFIFO', () => {
    it('should return oldest batches first', async () => {
      // Arrange
      const materialId = 'material-001';

      const mockBatches = [
        {
          id: 'batch-001',
          expiryDate: new Date('2026-03-01'),
          createdAt: new Date('2026-01-01'),
          status: 'normal',
          quantity: 50,
        },
        {
          id: 'batch-002',
          expiryDate: new Date('2026-04-01'),
          createdAt: new Date('2026-01-02'),
          status: 'normal',
          quantity: 100,
        },
      ];

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue(mockBatches as any);

      // Act
      const result = await service.getFIFO(materialId);

      // Assert
      expect(result).toEqual(mockBatches);
      expect(prisma.materialBatch.findMany).toHaveBeenCalledWith({
        where: {
          materialId,
          status: 'normal',
          quantity: { gt: 0 },
          deletedAt: null,
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      });
    });

    it('should exclude expired and locked batches', async () => {
      // Arrange
      const materialId = 'material-001';

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);

      // Act
      await service.getFIFO(materialId);

      // Assert
      expect(prisma.materialBatch.findMany).toHaveBeenCalledWith({
        where: {
          materialId,
          status: 'normal',
          quantity: { gt: 0 },
          deletedAt: null,
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      });
    });
  });

  describe('lockExpiredBatches', () => {
    it('should lock all expired batches', async () => {
      // Arrange
      const now = new Date('2026-02-15');

      const expiredBatches = [
        {
          id: 'batch-001',
          expiryDate: new Date('2026-01-01'),
          status: 'normal',
        },
        {
          id: 'batch-002',
          expiryDate: new Date('2026-02-01'),
          status: 'normal',
        },
      ];

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue(expiredBatches as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({} as any);

      // Act
      const result = await service.lockExpiredBatches(now);

      // Assert
      expect(result).toBe(2);
      expect(prisma.materialBatch.update).toHaveBeenCalledTimes(2);
    });
  });
});
