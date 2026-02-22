import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { MaterialBatchService } from './material-batch.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MaterialBatchService', () => {
  let service: MaterialBatchService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialBatchService,
        {
          provide: PrismaService,
          useValue: {
            materialBatch: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MaterialBatchService>(MaterialBatchService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all material batches', async () => {
      const mockBatches = [
        { id: 'batch-001', batchNumber: 'MAT-001' },
      ];

      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue(mockBatches as any);

      const result = await service.findAll();

      expect(result).toEqual(mockBatches);
    });

    it('should filter by materialId', async () => {
      jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);

      await service.findAll('material-001');

      expect(prisma.materialBatch.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          materialId: 'material-001',
        },
        include: {
          material: true,
          supplier: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return material batch with relations', async () => {
      const mockBatch = {
        id: 'batch-001',
        batchNumber: 'MAT-001',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockBatch as any);

      const result = await service.findOne('batch-001');

      expect(result).toEqual(mockBatch);
    });

    it('should throw NotFoundException if not found', async () => {
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update material batch', async () => {
      const mockBatch = {
        id: 'batch-001',
        deletedAt: null,
      };

      const updateDto = {
        quantity: 150,
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockBatch as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({
        ...mockBatch,
        ...updateDto,
      } as any);

      const result = await service.update('batch-001', updateDto);

      expect(result.quantity).toBe(150);
    });

    it('should not allow updating batchNumber (BR-242)', async () => {
      const mockBatch = {
        id: 'batch-001',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockBatch as any);

      await expect(
        service.update('batch-001', { batchNumber: 'NEW-001' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
