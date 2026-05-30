import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductionBatchService } from './production-batch.service';
import { BatchNumberGeneratorService } from './batch-number-generator.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OwnershipContext } from '../../module-access/ownership-context';

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
        productName: '前端伪造产品名',
      } as any);

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
        status: 'in_progress',
      };
      mockPrisma.productionBatch.create.mockResolvedValue(mockBatch);

      const result = await service.confirmProductBatch({
        ...validDto,
        productName: '包装端伪造产品名',
      } as any);

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
          status: 'in_progress',
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

describe('ProductionBatchService — getReleaseReadiness + releaseProductionBatch', () => {
  function buildPrisma(overrides: Partial<Record<string, any>> = {}) {
    return {
      product: { findFirst: jest.fn(), findUnique: jest.fn() },
      recipe: { findFirst: jest.fn() },
      productionBatch: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
      retainedSample: { findFirst: jest.fn().mockResolvedValue(null) },
      approvalInstance: { findFirst: jest.fn().mockResolvedValue(null) },
      ...overrides,
    } as any;
  }

  const BATCH_ID = 'batch-release-001';
  const PRODUCT_ID = 'prod-001';

  function batchBase(productType = 'finished_product') {
    return {
      id: BATCH_ID,
      batchNumber: 'PROD-TEST-001',
      productId: PRODUCT_ID,
      productName: '成品A',
      deletedAt: null,
      released_at: null,
      product: { id: PRODUCT_ID, product_type: productType },
    };
  }

  function makeService(prisma: any) {
    const batchGen: any = { generateBatchNumber: jest.fn() };
    return new ProductionBatchService(prisma, batchGen);
  }

  beforeEach(() => jest.clearAllMocks());

  describe('getReleaseReadiness', () => {
    it('returns ready=false with missing_product_inspection when no inspection records exist', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase());
      prisma.inspectionRecord.findMany.mockResolvedValue([]);
      prisma.nonConformance.findMany.mockResolvedValue([]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(false);
      expect(result.blockers.some(b => b.code === 'missing_product_inspection')).toBe(true);
    });

    it('returns ready=false with failed_safety_critical_inspection when a critical item failed', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase());
      prisma.inspectionRecord.findMany.mockResolvedValue([
        {
          id: 'ir-1',
          overall_result: 'fail',
          items: [
            {
              id: 'iri-1',
              judgment: 'fail',
              inspection_item: { id: 'ii-1', is_critical: true },
            },
          ],
        },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(false);
      expect(result.blockers.some(b => b.code === 'failed_safety_critical_inspection')).toBe(true);
    });

    it('returns ready=false with open_non_conformance_without_disposition for open NC without disposition', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase());
      prisma.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-1', overall_result: 'pass', items: [] },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([
        { id: 'nc-1', status: 'open', disposition: null, source_type: 'production_batch', source_id: BATCH_ID },
      ]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(false);
      expect(result.blockers.some(b => b.code === 'open_non_conformance_without_disposition')).toBe(true);
    });

    it('returns ready=false with non_conformance_disposition_not_concession for non-concession disposition', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase());
      prisma.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-1', overall_result: 'pass', items: [] },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([
        { id: 'nc-1', status: 'open', disposition: 'rework', source_type: 'production_batch', source_id: BATCH_ID },
      ]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(false);
      expect(result.blockers.some(b => b.code === 'non_conformance_disposition_not_concession')).toBe(true);
    });

    it('returns ready=false with concession_without_approved_approval_instance when concession NC has no approved instance', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase());
      prisma.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-1', overall_result: 'pass', items: [] },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([
        {
          id: 'nc-1',
          status: 'open',
          disposition: 'concession',
          source_type: 'production_batch',
          source_id: BATCH_ID,
        },
      ]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });
      prisma.approvalInstance.findFirst.mockResolvedValue(null);

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(false);
      expect(result.blockers.some(b => b.code === 'concession_without_approved_approval_instance')).toBe(true);
    });

    it('conditional release: non-safety-critical NC with concession + approved ApprovalInstance → ready=true', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase());
      prisma.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-1', overall_result: 'pass', items: [] },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([
        {
          id: 'nc-1',
          status: 'open',
          disposition: 'concession',
          source_type: 'production_batch',
          source_id: BATCH_ID,
        },
      ]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });
      prisma.approvalInstance.findFirst.mockResolvedValue({
        id: 'ai-1',
        status: 'APPROVED',
        completedAt: new Date(),
      });

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('returns ready=false with missing_retained_sample for finished_product batch without retained sample', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase('finished_product'));
      prisma.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-1', overall_result: 'pass', items: [] },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([]);
      prisma.retainedSample.findFirst.mockResolvedValue(null);

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(false);
      expect(result.blockers.some(b => b.code === 'missing_retained_sample')).toBe(true);
    });

    it('does not require retained sample for non-finished_product batch', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase('semi_finished'));
      prisma.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-1', overall_result: 'pass', items: [] },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([]);
      prisma.retainedSample.findFirst.mockResolvedValue(null);

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('returns ready=true when all checks pass (finished_product with retained sample)', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase('finished_product'));
      prisma.inspectionRecord.findMany.mockResolvedValue([
        {
          id: 'ir-1',
          overall_result: 'pass',
          items: [{ id: 'iri-1', judgment: 'pass', inspection_item: { id: 'ii-1', is_critical: false } }],
        },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });

      const svc = makeService(prisma);
      const result = await svc.getReleaseReadiness(BATCH_ID);

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('throws NotFoundException when batch does not exist', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(null);

      const svc = makeService(prisma);
      await expect(svc.getReleaseReadiness(BATCH_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('releaseProductionBatch', () => {
    const RELEASER_ID = 'user-releaser-1';

    it('fails with BadRequestException when blockers exist', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase());
      prisma.inspectionRecord.findMany.mockResolvedValue([]);
      prisma.nonConformance.findMany.mockResolvedValue([]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });

      const svc = makeService(prisma);
      await expect(svc.releaseProductionBatch(BATCH_ID, RELEASER_ID)).rejects.toThrow(BadRequestException);
    });

    it('writes released_at and released_by_id when all checks pass', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase('finished_product'));
      prisma.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-1', overall_result: 'pass', items: [] },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });
      prisma.productionBatch.update.mockResolvedValue({
        ...batchBase('finished_product'),
        released_at: new Date(),
        released_by_id: RELEASER_ID,
      });

      const svc = makeService(prisma);
      const result = await svc.releaseProductionBatch(BATCH_ID, RELEASER_ID);

      expect(prisma.productionBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BATCH_ID },
          data: expect.objectContaining({
            released_at: expect.any(Date),
            released_by_id: RELEASER_ID,
          }),
        }),
      );
      expect(result.released_by_id).toBe(RELEASER_ID);
    });

    it('does NOT write the legacy released_by Int field', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(batchBase('finished_product'));
      prisma.inspectionRecord.findMany.mockResolvedValue([
        { id: 'ir-1', overall_result: 'pass', items: [] },
      ]);
      prisma.nonConformance.findMany.mockResolvedValue([]);
      prisma.retainedSample.findFirst.mockResolvedValue({ id: 'rs-1' });
      prisma.productionBatch.update.mockResolvedValue({ ...batchBase(), released_by_id: RELEASER_ID });

      const svc = makeService(prisma);
      await svc.releaseProductionBatch(BATCH_ID, RELEASER_ID);

      const updateCall = prisma.productionBatch.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('released_by');
    });

    it('throws NotFoundException when batch does not exist', async () => {
      const prisma = buildPrisma();
      prisma.productionBatch.findUnique.mockResolvedValue(null);

      const svc = makeService(prisma);
      await expect(svc.releaseProductionBatch(BATCH_ID, RELEASER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('ProductionBatchService.findAll with ownership', () => {
  function freshService(userFindManyResult: any[] = []) {
    const prisma: any = {
      product: { findFirst: jest.fn() },
      recipe: { findFirst: jest.fn() },
      productionBatch: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      user: { findMany: jest.fn().mockResolvedValue(userFindManyResult) },
    };
    const batchGen: any = { generateBatchNumber: jest.fn() };
    return { svc: new ProductionBatchService(prisma, batchGen), prisma };
  }

  beforeEach(() => jest.clearAllMocks());

  it('admin sees all batches (no leader_id filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll({}, o);
    const callWhere = prisma.productionBatch.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('leader_id');
  });

  it('user sees batches where leader_id = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll({}, o);
    const callWhere = prisma.productionBatch.findMany.mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ leader_id: 'u-1' });
  });

  it('leader sees batches where leader_id IN managed-dept members', async () => {
    const { svc, prisma } = freshService([{ id: 'm-1' }, { id: 'm-2' }]);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll({}, o);
    const callWhere = prisma.productionBatch.findMany.mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ leader_id: { in: ['m-1', 'm-2'] } });
  });
});
