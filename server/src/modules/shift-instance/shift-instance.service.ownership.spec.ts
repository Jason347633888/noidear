/**
 * ShiftInstanceService.findAll with ownership filtering
 * ShiftInstance.leader_id is the user FK.
 */
import { ShiftInstanceService } from './shift-instance.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    shiftInstance: { findMany: jest.fn().mockResolvedValue([]) },
    shiftType: { findFirst: jest.fn() },
    productionTeamSchedule: { findMany: jest.fn().mockResolvedValue([]) },
    productionTeam: { findUnique: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new ShiftInstanceService(prisma), prisma };
}

describe('ShiftInstanceService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all shift instances (no leader_id filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll(undefined, o);
    const callWhere = prisma.shiftInstance.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('leader_id');
  });

  it('user sees shift instances where leader_id = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(undefined, o);
    const callWhere = prisma.shiftInstance.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('leader_id', 'u-1');
  });

  it('leader sees shift instances where leader_id IN managed dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll(undefined, o);
    const callWhere = prisma.shiftInstance.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('leader_id', { in: ['m-1', 'm-2'] });
  });
});
