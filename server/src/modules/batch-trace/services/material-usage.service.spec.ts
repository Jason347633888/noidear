import { Test, TestingModule } from '@nestjs/testing';
import { MaterialUsageService } from './material-usage.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MaterialUsageService', () => {
  let service: MaterialUsageService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialUsageService,
        {
          provide: PrismaService,
          useValue: {
            productionBatch: {
              findUnique: jest.fn(),
            },
            materialBatch: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            batchMaterialUsage: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<MaterialUsageService>(MaterialUsageService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create material usage and decrement stock', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001' };
      const mockMaterialBatch = { id: 'mat-1', quantity: 50 };
      const mockUsage = { id: 'usage-1', ...dto };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'create').mockResolvedValue(mockUsage as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({} as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockUsage);
      expect(prisma.batchMaterialUsage.create).toHaveBeenCalledWith({
        data: dto,
      });
      expect(prisma.materialBatch.update).toHaveBeenCalledWith({
        where: { id: dto.materialBatchId },
        data: { quantity: { decrement: dto.quantity } },
      });
    });

    it('should throw NotFoundException if production batch not found', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        quantity: 10,
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if material batch not found', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001' };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        quantity: 100,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001' };
      const mockMaterialBatch = { id: 'mat-1', quantity: 50 };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByProductionBatch', () => {
    it('should return material usages for production batch', async () => {
      const productionBatchId = 'prod-1';
      const mockUsages = [
        {
          id: 'usage-1',
          productionBatchId,
          materialBatchId: 'mat-1',
          quantity: 10,
        },
      ];

      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue(mockUsages as any);

      const result = await service.findByProductionBatch(productionBatchId);

      expect(result).toEqual(mockUsages);
      expect(prisma.batchMaterialUsage.findMany).toHaveBeenCalledWith({
        where: { productionBatchId },
        include: {
          materialBatch: {
            include: { material: true, supplier: true },
          },
          productionBatch: true,
        },
      });
    });
  });

  describe('remove', () => {
    it('should remove usage and increment stock', async () => {
      const id = 'usage-1';
      const mockUsage = {
        id,
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        quantity: 10,
      };

      jest.spyOn(prisma.batchMaterialUsage, 'findUnique').mockResolvedValue(mockUsage as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.batchMaterialUsage, 'delete').mockResolvedValue(mockUsage as any);

      await service.remove(id);

      expect(prisma.materialBatch.update).toHaveBeenCalledWith({
        where: { id: mockUsage.materialBatchId },
        data: { quantity: { increment: mockUsage.quantity } },
      });
      expect(prisma.batchMaterialUsage.delete).toHaveBeenCalledWith({ where: { id } });
    });

    it('should throw NotFoundException if usage not found', async () => {
      const id = 'usage-1';

      jest.spyOn(prisma.batchMaterialUsage, 'findUnique').mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
