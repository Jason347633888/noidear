/**
 * Task 44 Step 2 — RequisitionService.listForOwnership
 * MaterialRequisition.departmentId (String?) for leader; applicantId has no FK relation.
 * user → [] (empty-set fallback, deferred to Task 46 for applicantId FK)
 * leader → departmentId IN managedDepartmentIds
 * admin → no filter
 */
import { RequisitionService } from './requisition.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    materialRequisition: { findMany: jest.fn().mockResolvedValue([{ id: 'req-1' }]) },
  };
  const inventoryLedger: any = {};
  const supplierAccess: any = {};
  return { svc: new RequisitionService(prisma, undefined, inventoryLedger, supplierAccess), prisma };
}

describe('RequisitionService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('user gets [] (applicantId has no FK relation, deferred to Task 46)', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });

  it('leader sees requisitions from their managed departments', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1', 'd-2'] };
    await svc.listForOwnership(o);
    expect(prisma.materialRequisition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ departmentId: { in: ['d-1', 'd-2'] } }) }),
    );
  });

  it('admin gets all requisitions (no user filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.materialRequisition.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('departmentId');
    expect(callWhere).not.toHaveProperty('applicantId');
  });
});
