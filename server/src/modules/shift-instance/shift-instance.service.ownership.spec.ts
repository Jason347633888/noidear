/**
 * ShiftInstanceService.findAll with ownership filtering
 * ShiftInstance.leader_id is the user FK.
 * Also covers create() leader_id fallback to userId when no team binding.
 */
import { ShiftInstanceService } from './shift-instance.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    shiftInstance: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'si-1' }), findUnique: jest.fn().mockResolvedValue(null) },
    shiftType: { findFirst: jest.fn() },
    teamShiftSchedule: { findMany: jest.fn().mockResolvedValue([]) },
    team: { findFirst: jest.fn() },
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

describe('ShiftInstanceService.create leader_id fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('when no team binding leaderId, falls back to creator userId', async () => {
    const { svc, prisma } = freshService();
    // No schedules → no team binding → leaderId will be undefined
    prisma.teamShiftSchedule.findMany.mockResolvedValue([]);
    prisma.shiftType.findFirst.mockResolvedValue({
      id: 'shift-day',
      name: '白班',
      active: true,
    });
    prisma.shiftInstance.findUnique.mockResolvedValue(null);

    await svc.create({ shiftTypeId: 'shift-day', shift_type: '白班', shift_date: '2024-01-01' } as any, 'creator-u-1');

    const callData = prisma.shiftInstance.create.mock.calls[0][0].data;
    // leader_id should fall back to userId when teamBinding.leaderId is undefined/null
    expect(callData.leader_id).toBe('creator-u-1');
    expect(callData.opened_by).toBe('creator-u-1');
  });

  it('when team binding has leaderId, uses that leaderId (not fallback)', async () => {
    const { svc, prisma } = freshService();
    // Schedule with an explicit leader
    prisma.teamShiftSchedule.findMany.mockResolvedValue([
      { team_id: 'team-1', leader_id: 'sched-leader-1' },
    ]);
    prisma.shiftType.findFirst.mockResolvedValue({
      id: 'shift-day',
      name: '白班',
      active: true,
    });
    prisma.shiftInstance.findUnique.mockResolvedValue(null);
    prisma.team.findFirst.mockResolvedValue({ id: 'team-1', active: true });

    await svc.create({ shiftTypeId: 'shift-day', shift_type: '白班', shift_date: '2024-01-01' } as any, 'creator-u-1');

    const callData = prisma.shiftInstance.create.mock.calls[0][0].data;
    expect(callData.leader_id).toBe('sched-leader-1');
  });
});
