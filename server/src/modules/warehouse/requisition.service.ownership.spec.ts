/**
 * Task 46 update — RequisitionService.listForOwnership with applicantId FK
 * admin → all; user → applicantId = userId; leader → departmentId OR applicantId IN members
 */
import { RequisitionService } from './requisition.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    materialRequisition: { findMany: jest.fn().mockResolvedValue([{ id: 'req-1' }]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const inventoryLedger: any = {};
  const supplierAccess: any = {};
  return { svc: new RequisitionService(prisma, undefined, inventoryLedger, supplierAccess), prisma };
}

describe('RequisitionService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all requisitions (no user filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.materialRequisition.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('applicantId');
    expect(callWhere).not.toHaveProperty('departmentId');
    expect(callWhere).not.toHaveProperty('OR');
  });

  it('user sees requisitions where applicantId = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.materialRequisition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, applicantId: 'u-1' } }),
    );
  });

  it('leader sees requisitions from their managed departments (OR applicantId IN members)', async () => {
    const { svc, prisma } = freshService(['m-1']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1', 'd-2'] };
    await svc.listForOwnership(o);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { departmentId: { in: ['d-1', 'd-2'] } } }),
    );
    const callWhere = prisma.materialRequisition.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('OR');
    expect(callWhere.OR).toEqual(expect.arrayContaining([
      { departmentId: { in: ['d-1', 'd-2'] } },
      { applicantId: { in: ['m-1'] } },
    ]));
  });

  it('leader with no managed depts gets []', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });
});
