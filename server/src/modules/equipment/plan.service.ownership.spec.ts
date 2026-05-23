/**
 * Task 42 Step 3 — PlanService.listForOwnership empty-set fallback
 * MaintenancePlan lacks responsiblePersonId FK until Task 46.
 * user → []; leader/admin → findMany({})
 */
import { PlanService } from './plan.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    maintenancePlan: { findMany: jest.fn().mockResolvedValue([{ id: 'mp-1' }]) },
  };
  return { svc: new PlanService(prisma), prisma };
}

describe('PlanService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('user gets [] (missing responsiblePersonId FK, deferred to Task 46)', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });

  it('leader gets all plans (empty-set fallback, deferred to Task 46)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    const result = await svc.listForOwnership(o);
    expect(prisma.maintenancePlan.findMany).toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
  });

  it('admin gets all plans', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.listForOwnership(o);
    expect(prisma.maintenancePlan.findMany).toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
  });
});
