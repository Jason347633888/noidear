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
        quantity: 50,
      };

      const mockUsage = {
        id: 'usage-001',
        ...createDto,
        usedAt: new Date(),
      };

      jest.spyOn(prisma.batchMaterialUsage, 'create').mockResolvedValue(mockUsage as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUsage);
      expect(prisma.batchMaterialUsage.create).toHaveBeenCalledWith({
        data: createDto,
      });
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
