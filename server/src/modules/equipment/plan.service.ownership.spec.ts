/**
 * PlanService.findAll with ownership filtering
 * MaintenancePlan uses responsiblePersonId FK.
 * admin → all; user → responsiblePersonId = userId; leader → IN members(managedDepts)
 */
import { PlanService } from './plan.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    maintenancePlan: {
      findMany: jest.fn().mockResolvedValue([{ id: 'mp-1' }]),
      count: jest.fn().mockResolvedValue(1),
    },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new PlanService(prisma), prisma };
}

describe('PlanService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all plans (no responsiblePersonId filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll({}, o);
    const callWhere = prisma.maintenancePlan.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('responsiblePersonId');
  });

  it('user gets plans where responsiblePersonId = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll({}, o);
    const callWhere = prisma.maintenancePlan.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('responsiblePersonId', 'u-1');
  });

  it('leader gets plans where responsiblePersonId IN managed dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll({}, o);
    const callWhere = prisma.maintenancePlan.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('responsiblePersonId', { in: ['m-1', 'm-2'] });
  });
});
