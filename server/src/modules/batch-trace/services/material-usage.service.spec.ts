import { Test, TestingModule } from '@nestjs/testing';
import { MaterialUsageService } from './material-usage.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OwnershipContext } from '../../module-access/ownership-context';

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
            recipeLine: {
              findFirst: jest.fn(),
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
        recipeLineId: 'line-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001', recipeId: 'recipe-1' };
      const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: 'area-1', area_name_snapshot: '搅料间' };
      const mockMaterialBatch = { id: 'mat-1', materialId: 'mat-id-1', quantity: 50, status: 'normal' };
      const mockUsage = { id: 'usage-1', ...dto };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue(mockRecipeLine as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'create').mockResolvedValue(mockUsage as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({} as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockUsage);
      expect(prisma.batchMaterialUsage.create).toHaveBeenCalledWith({
        data: {
          productionBatchId: dto.productionBatchId,
          materialBatchId: dto.materialBatchId,
          recipeLineId: dto.recipeLineId,
          area_id: mockRecipeLine.area_id,
          areaNameSnapshot: mockRecipeLine.area_name_snapshot,
          quantity: dto.quantity,
        },
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
        recipeLineId: 'line-1',
        quantity: 10,
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if production batch has no recipe', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001', recipeId: null };
      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if recipe line not found or does not belong to recipe', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001', recipeId: 'recipe-1' };
      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if material batch not found', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001', recipeId: 'recipe-1' };
      const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: 'area-1', area_name_snapshot: '筛粉间' };
      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue(mockRecipeLine as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if material does not match recipe line', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001', recipeId: 'recipe-1' };
      const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: 'area-1', area_name_snapshot: '筛粉间' };
      const mockMaterialBatch = { id: 'mat-1', materialId: 'different-material', quantity: 50 };
      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue(mockRecipeLine as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 100,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001', recipeId: 'recipe-1' };
      const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: 'area-1', area_name_snapshot: '筛粉间' };
      const mockMaterialBatch = { id: 'mat-1', materialId: 'mat-id-1', quantity: 50, status: 'normal' };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue(mockRecipeLine as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if material batch status is expired', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001', recipeId: 'recipe-1' };
      const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: 'area-1', area_name_snapshot: '筛粉间' };
      const mockMaterialBatch = { id: 'mat-1', materialId: 'mat-id-1', quantity: 50, status: 'expired' };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue(mockRecipeLine as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if material batch status is locked', async () => {
      const dto = {
        productionBatchId: 'prod-1',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 10,
      };

      const mockProductionBatch = { id: 'prod-1', batchNumber: 'PROD-001', recipeId: 'recipe-1' };
      const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: 'area-1', area_name_snapshot: '筛粉间' };
      const mockMaterialBatch = { id: 'mat-1', materialId: 'mat-id-1', quantity: 50, status: 'locked' };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue(mockRecipeLine as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('non-admin accessing other user productionBatchId → ForbiddenException, materialBatch.update not called', async () => {
      const dto = {
        productionBatchId: 'prod-other',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 10,
      };
      const ownership: OwnershipContext = {
        userId: 'u-1',
        roleCode: 'user',
        departmentId: null,
        managedDepartmentIds: [],
      };
      // productionBatch.findMany for visibleProductionBatchIds → user only sees prod-own
      (prisma as any).productionBatch.findMany = jest.fn().mockResolvedValue([{ id: 'prod-own' }]);

      await expect(service.create(dto, ownership)).rejects.toThrow(ForbiddenException);
      expect(prisma.materialBatch.update).not.toHaveBeenCalled();
    });

    it('admin can write to any productionBatchId (no ownership filter)', async () => {
      const dto = {
        productionBatchId: 'prod-any',
        materialBatchId: 'mat-1',
        recipeLineId: 'line-1',
        quantity: 10,
      };
      const adminOwnership: OwnershipContext = {
        userId: 'admin-1',
        roleCode: 'admin',
        departmentId: null,
        managedDepartmentIds: undefined,
      };
      const mockProductionBatch = { id: 'prod-any', batchNumber: 'PROD-ANY', recipeId: 'recipe-1' };
      const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: 'area-1', area_name_snapshot: '搅料间' };
      const mockMaterialBatch = { id: 'mat-1', materialId: 'mat-id-1', quantity: 50, status: 'normal' };
      const mockUsage = { id: 'usage-1', ...dto };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue(mockProductionBatch as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue(mockRecipeLine as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockMaterialBatch as any);
      jest.spyOn(prisma.batchMaterialUsage, 'create').mockResolvedValue(mockUsage as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({} as any);

      const result = await service.create(dto, adminOwnership);
      expect(result).toEqual(mockUsage);
      expect(prisma.materialBatch.update).toHaveBeenCalled();
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
