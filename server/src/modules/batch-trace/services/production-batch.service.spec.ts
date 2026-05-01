import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductionBatchService } from './production-batch.service';
import { BatchNumberGeneratorService } from './batch-number-generator.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
  },
  recipe: {
    findFirst: jest.fn(),
  },
  productionBatch: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('ProductionBatchService', () => {
  let service: ProductionBatchService;
  let batchNumberGenerator: BatchNumberGeneratorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionBatchService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
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
    batchNumberGenerator = module.get<BatchNumberGeneratorService>(BatchNumberGeneratorService);
  });

  describe('create', () => {
    it('should create production batch with auto-generated batch number', async () => {
      jest.spyOn(batchNumberGenerator, 'generateBatchNumber').mockResolvedValue('PROD-20260215-001');
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: '蛋糕', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue({ id: 'r1', version: 1, status: 'active', product_id: 'p1' });

      const mockBatch = {
        id: 'batch-001',
        batchNumber: 'PROD-20260215-001',
        productId: 'p1',
        recipeId: 'r1',
        productName: '蛋糕',
        recipeName: 'v1',
        plannedQuantity: 100,
        productionDate: new Date('2026-02-15'),
        status: 'pending',
      };

      mockPrisma.productionBatch.create.mockResolvedValue(mockBatch);

      const result = await service.create({
        productId: 'p1',
        recipeId: 'r1',
        plannedQuantity: 100,
        productionDate: new Date('2026-02-15'),
      });

      expect(result.batchNumber).toBe('PROD-20260215-001');
      expect(batchNumberGenerator.generateBatchNumber).toHaveBeenCalledWith('production');
    });

    it('创建生产批次时根据产品和配方写入快照', async () => {
      jest.spyOn(batchNumberGenerator, 'generateBatchNumber').mockResolvedValue('PROD-20260429-001');
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: '老产品A', code: 'CP-000001', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue({ id: 'r1', version: 1, status: 'active', product_id: 'p1' });
      mockPrisma.productionBatch.create.mockResolvedValue({ id: 'pb1' });

      await service.create({
        productId: 'p1',
        recipeId: 'r1',
        plannedQuantity: 100,
        productionDate: new Date('2026-04-29T00:00:00.000Z'),
      });

      expect(mockPrisma.productionBatch.create).toHaveBeenCalledWith({
        data: {
          batchNumber: 'PROD-20260429-001',
          productId: 'p1',
          recipeId: 'r1',
          productName: '老产品A',
          recipeName: 'v1',
          plannedQuantity: 100,
          productionDate: new Date('2026-04-29T00:00:00.000Z'),
          status: 'pending',
        },
      });
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', company_id: '1', status: 'active', deleted_at: null },
      });
      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', product_id: 'p1', company_id: '1', status: 'active' },
      });
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

      mockPrisma.productionBatch.findMany.mockResolvedValue(mockBatches);
      mockPrisma.productionBatch.count.mockResolvedValue(1);

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

      mockPrisma.productionBatch.findMany.mockResolvedValue([]);
      mockPrisma.productionBatch.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(mockPrisma.productionBatch.findMany).toHaveBeenCalledWith({
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

      mockPrisma.productionBatch.findUnique.mockResolvedValue(mockBatch);

      const result = await service.findOne('batch-001');

      expect(result).toEqual(mockBatch);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.productionBatch.findUnique.mockResolvedValue(null);

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

      mockPrisma.productionBatch.findUnique.mockResolvedValue(mockBatch);
      mockPrisma.productionBatch.update.mockResolvedValue({
        ...mockBatch,
        ...updateDto,
      });

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

      mockPrisma.productionBatch.findUnique.mockResolvedValue(mockBatch);

      await expect(service.update('batch-001', updateDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmProductBatch', () => {
    const validDto = {
      batchNumber: 'PROD-PKG-001',
      productId: 'p1',
      recipeId: 'r1',
      actualQuantity: 100,
      unit: 'kg',
      productionDate: '2026-04-30T00:00:00.000Z',
      packagedAt: '2026-04-30T08:00:00.000Z',
      warehousedAt: '2026-04-30T10:00:00.000Z',
      packageMachine: 'PKG-M-01',
      teamId: 'team-1',
      shiftTypeId: 'shift-1',
    };

    it('should confirm product batch successfully', async () => {
      mockPrisma.productionBatch.findUnique.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: '蛋糕', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue({ id: 'r1', version: 1, version_note: '经典配方', status: 'active', product_id: 'p1' });
      const mockBatch = {
        id: 'batch-pkg-001',
        batchNumber: 'PROD-PKG-001',
        status: 'completed',
      };
      mockPrisma.productionBatch.create.mockResolvedValue(mockBatch);

      const result = await service.confirmProductBatch(validDto);

      expect(result).toEqual(mockBatch);
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', company_id: '1', status: 'active', deleted_at: null },
      });
      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', product_id: 'p1', company_id: '1', status: 'active' },
      });
      expect(mockPrisma.productionBatch.create).toHaveBeenCalledWith({
        data: {
          batchNumber: 'PROD-PKG-001',
          productId: 'p1',
          productName: '蛋糕',
          recipeId: 'r1',
          recipeName: '经典配方',
          actualQuantity: 100,
          unit: 'kg',
          productionDate: new Date('2026-04-30T00:00:00.000Z'),
          packagedAt: new Date('2026-04-30T08:00:00.000Z'),
          warehousedAt: new Date('2026-04-30T10:00:00.000Z'),
          packageMachine: 'PKG-M-01',
          team_id: 'team-1',
          shift_type_id: 'shift-1',
          status: 'completed',
        },
      });
    });

    it('should throw ConflictException when batchNumber already exists', async () => {
      mockPrisma.productionBatch.findUnique.mockResolvedValue({ id: 'existing', batchNumber: 'PROD-PKG-001' });

      await expect(service.confirmProductBatch(validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when product not found', async () => {
      mockPrisma.productionBatch.findUnique.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.confirmProductBatch(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when recipe not found', async () => {
      mockPrisma.productionBatch.findUnique.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: '蛋糕', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue(null);

      await expect(service.confirmProductBatch(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject recipe that does not belong to the selected product', async () => {
      mockPrisma.productionBatch.findUnique.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: '蛋糕', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue(null);

      await expect(service.confirmProductBatch(validDto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', product_id: 'p1', company_id: '1', status: 'active' },
      });
    });
  });
});
