import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { BatchMaterialUsageService } from './batch-material-usage.service';
import { NotFoundException } from '@nestjs/common';

describe('BatchMaterialUsageService', () => {
  let service: BatchMaterialUsageService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchMaterialUsageService,
        {
          provide: PrismaService,
          useValue: {
            batchMaterialUsage: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            productionBatch: {
              findUnique: jest.fn(),
            },
            recipeLine: {
              findFirst: jest.fn(),
            },
            materialBatch: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BatchMaterialUsageService>(BatchMaterialUsageService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create batch material usage', async () => {
      const createDto = {
        productionBatchId: 'prod-001',
        materialBatchId: 'mat-001',
        recipeLineId: 'line-001',
        quantity: 50,
      };

      const mockUsage = {
        id: 'usage-001',
        ...createDto,
        area_id: 'area-001',
        areaNameSnapshot: '筛粉间',
        usedAt: new Date(),
      };

      jest.spyOn(prisma.productionBatch, 'findUnique').mockResolvedValue({
        id: 'prod-001',
        recipeId: 'recipe-001',
      } as any);
      jest.spyOn(prisma.recipeLine, 'findFirst').mockResolvedValue({
        id: 'line-001',
        recipe_id: 'recipe-001',
        material_id: 'mat-raw-001',
        area_id: 'area-001',
        area_name_snapshot: '筛粉间',
      } as any);
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue({
        id: 'mat-001',
        materialId: 'mat-raw-001',
      } as any);
      jest.spyOn(prisma.batchMaterialUsage, 'create').mockResolvedValue(mockUsage as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUsage);
      expect(prisma.batchMaterialUsage.create).toHaveBeenCalledWith({
        data: {
          productionBatchId: 'prod-001',
          materialBatchId: 'mat-001',
          recipeLineId: 'line-001',
          area_id: 'area-001',
          areaNameSnapshot: '筛粉间',
          quantity: 50,
        },
      });
    });
  });

  it('投料时从 recipeLine 写入区域快照', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pb1', recipeId: 'r1' }),
      },
      recipeLine: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'line1',
          recipe_id: 'r1',
          material_id: 'mat1',
          area_id: 'area1',
          area_name_snapshot: '筛粉间',
        }),
      },
      materialBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'mb1', materialId: 'mat1' }),
      },
      batchMaterialUsage: {
        create: jest.fn().mockResolvedValue({ id: 'usage1' }),
      },
    };
    const service = new BatchMaterialUsageService(prisma);

    await service.create({
      productionBatchId: 'pb1',
      materialBatchId: 'mb1',
      recipeLineId: 'line1',
      quantity: 10,
    });

    expect(prisma.batchMaterialUsage.create).toHaveBeenCalledWith({
      data: {
        productionBatchId: 'pb1',
        materialBatchId: 'mb1',
        recipeLineId: 'line1',
        area_id: 'area1',
        areaNameSnapshot: '筛粉间',
        quantity: 10,
      },
    });
  });

  describe('getProductionBatchMaterials', () => {
    it('should return all materials used in production batch', async () => {
      const mockUsages = [
        {
          id: 'usage-001',
          materialBatch: {
            id: 'mat-001',
            batchNumber: 'MAT-001',
            material: {
              name: '面粉',
            },
          },
          quantity: 50,
        },
      ];

      jest.spyOn(prisma.batchMaterialUsage, 'findMany').mockResolvedValue(mockUsages as any);

      const result = await service.getProductionBatchMaterials('prod-001');

      expect(result).toEqual(mockUsages);
      expect(prisma.batchMaterialUsage.findMany).toHaveBeenCalledWith({
        where: { productionBatchId: 'prod-001' },
        include: {
          materialBatch: {
            include: {
              material: true,
              supplier: true,
            },
          },
        },
        orderBy: { usedAt: 'asc' },
      });
    });
  });
});
