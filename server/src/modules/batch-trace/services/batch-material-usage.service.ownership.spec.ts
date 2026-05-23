/**
 * Task 43 — BatchMaterialUsageService.listForOwnership
 * Filters batchMaterialUsage by visibleProductionBatchIds upstream filter.
 * admin → no filter; user → leader_id = userId on ProductionBatch;
 * leader → leader_id IN memberIds on ProductionBatch
 */
import { BatchMaterialUsageService } from './batch-material-usage.service';
import { OwnershipContext } from '../../module-access/ownership-context';

function freshService(batchIds: string[] = [], memberIds: string[] = []) {
  const prisma: any = {
    productionBatch: {
      findMany: jest.fn().mockResolvedValue(batchIds.map((id) => ({ id }))),
    },
    batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new BatchMaterialUsageService(prisma), prisma };
}

describe('BatchMaterialUsageService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all usages (no batch filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.batchMaterialUsage.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('productionBatchId');
  });

  it('user gets usages for their batches', async () => {
    const { svc, prisma } = freshService(['pb-1', 'pb-2']);
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.productionBatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { leader_id: 'u-1' } }),
    );
    expect(prisma.batchMaterialUsage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productionBatchId: { in: ['pb-1', 'pb-2'] } } }),
    );
  });

  it('user with no batches gets []', async () => {
    const { svc } = freshService([]);
    const o: OwnershipContext = { userId: 'u-2', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });

  it('leader gets usages for managed-dept members batches', async () => {
    const { svc, prisma } = freshService(['pb-3'], ['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.batchMaterialUsage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productionBatchId: { in: ['pb-3'] } } }),
    );
  });
});
