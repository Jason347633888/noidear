/**
 * P1-R17-2: 验证 ProductionBatchService.create 写入 leader_id，
 * 使创建者能在 findAll 中看到自己创建的批次。
 */
import { ProductionBatchService } from './production-batch.service';
import { OwnershipContext } from '../../module-access/ownership-context';

describe('ProductionBatchService create → leader_id ownership', () => {
  function freshService() {
    const prisma: any = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', name: '蛋糕', status: 'active' }) },
      recipe: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', version: 1, status: 'active', product_id: 'p1' }) },
      productionBatch: {
        create: jest.fn().mockResolvedValue({ id: 'pb-new', leader_id: 'u-creator' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'pb-new', leader_id: 'u-creator' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const batchGen: any = { generateBatchNumber: jest.fn().mockResolvedValue('PROD-2026-001') };
    return { svc: new ProductionBatchService(prisma, batchGen), prisma };
  }

  beforeEach(() => jest.clearAllMocks());

  it('create passes leader_id = creatorId to Prisma when creatorId is provided', async () => {
    const { svc, prisma } = freshService();
    await svc.create(
      { productId: 'p1', recipeId: 'r1', plannedQuantity: 100, productionDate: new Date('2026-05-01') },
      'u-creator',
    );
    const callData = prisma.productionBatch.create.mock.calls[0][0].data;
    expect(callData).toHaveProperty('leader_id', 'u-creator');
  });

  it('a batch created by user X (leader_id = X.id) is visible to user X in findAll', async () => {
    const { svc, prisma } = freshService();
    // 创建批次，传入 creatorId
    await svc.create(
      { productId: 'p1', recipeId: 'r1', plannedQuantity: 100, productionDate: new Date('2026-05-01') },
      'u-creator',
    );
    // findAll 以 user ownership 查询，应包含该批次
    const ownershipAsCreator: OwnershipContext = {
      userId: 'u-creator',
      roleCode: 'user',
      departmentId: 'd-1',
      managedDepartmentIds: [],
    };
    const result = await svc.findAll({}, ownershipAsCreator);
    expect(result.total).toBeGreaterThan(0);
    // findMany 应当携带 leader_id 过滤
    const callWhere = prisma.productionBatch.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('leader_id', 'u-creator');
  });

  it('create without creatorId does NOT write leader_id (backward-compat: undefined)', async () => {
    const { svc, prisma } = freshService();
    await svc.create(
      { productId: 'p1', recipeId: 'r1', plannedQuantity: 100, productionDate: new Date('2026-05-01') },
    );
    const callData = prisma.productionBatch.create.mock.calls[0][0].data;
    // 不传 creatorId 时，leader_id 字段不应出现
    expect(callData).not.toHaveProperty('leader_id');
  });
});

describe('ProductionBatchService confirmProductBatch → leader_id ownership', () => {
  function freshConfirmService() {
    const prisma: any = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', name: '蛋糕', status: 'active', deleted_at: null }) },
      recipe: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', version: 1, status: 'active', product_id: 'p1', version_note: null }) },
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null), // 不存在，可以创建
        create: jest.fn().mockResolvedValue({ id: 'pb-confirm', leader_id: 'u-creator', status: 'completed' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'pb-confirm', leader_id: 'u-creator' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const batchGen: any = { generateBatchNumber: jest.fn().mockResolvedValue('PROD-2026-001') };
    return { svc: new ProductionBatchService(prisma, batchGen), prisma };
  }

  const confirmDto = {
    batchNumber: 'PROD-2026-001',
    productId: 'p1',
    recipeId: 'r1',
    actualQuantity: 100,
    unit: 'kg',
    productionDate: '2026-05-01',
    packagedAt: '2026-05-02',
    warehousedAt: '2026-05-03',
    packageMachine: 'M-01',
    teamId: 't1',
    shiftTypeId: 's1',
  };

  beforeEach(() => jest.clearAllMocks());

  it('confirmProductBatch writes leader_id when creatorId is provided', async () => {
    const { svc, prisma } = freshConfirmService();
    await svc.confirmProductBatch(confirmDto, 'u-creator');
    const callData = prisma.productionBatch.create.mock.calls[0][0].data;
    expect(callData).toHaveProperty('leader_id', 'u-creator');
  });

  it('confirmed batch is visible to creator in findAll', async () => {
    const { svc, prisma } = freshConfirmService();
    await svc.confirmProductBatch(confirmDto, 'u-creator');
    const ownershipAsCreator: OwnershipContext = {
      userId: 'u-creator',
      roleCode: 'user',
      departmentId: 'd-1',
      managedDepartmentIds: [],
    };
    const result = await svc.findAll({}, ownershipAsCreator);
    expect(result.total).toBeGreaterThan(0);
    const callWhere = prisma.productionBatch.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('leader_id', 'u-creator');
  });

  it('confirmProductBatch without creatorId does NOT write leader_id', async () => {
    const { svc, prisma } = freshConfirmService();
    await svc.confirmProductBatch(confirmDto);
    const callData = prisma.productionBatch.create.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty('leader_id');
  });
});
