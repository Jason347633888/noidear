/**
 * Task 46 update — PlanService.listForOwnership with responsiblePersonId FK
 * admin → all; user → responsiblePersonId = userId; leader → IN members(managedDepts)
 */
import { PlanService } from './plan.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    maintenancePlan: { findMany: jest.fn().mockResolvedValue([{ id: 'mp-1' }]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new PlanService(prisma), prisma };
}

describe('PlanService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all plans (no filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.listForOwnership(o);
    expect(result.length).toBeGreaterThan(0);
    expect(prisma.maintenancePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
  });

  it('user gets plans where responsiblePersonId = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.maintenancePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, responsiblePersonId: 'u-1' } }),
    );
  });

  it('leader gets plans where responsiblePersonId IN members of managed depts', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { departmentId: { in: ['d-1'] } } }),
    );
    expect(prisma.maintenancePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, responsiblePersonId: { in: ['m-1', 'm-2'] } } }),
    );
  });

  it('leader with no managed depts gets []', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });
});
