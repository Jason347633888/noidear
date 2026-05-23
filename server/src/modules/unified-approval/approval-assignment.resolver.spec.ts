import { ApprovalAssignmentResolver } from './approval-assignment.resolver';

describe('ApprovalAssignmentResolver', () => {
  const prisma = {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    department: { findUnique: jest.fn() },
  } as any;
  const resolver = new ApprovalAssignmentResolver(prisma);

  beforeEach(() => jest.resetAllMocks());

  it('USER assignment returns DIRECT claim with single user', async () => {
    const r = await resolver.resolveAssignment({ type: 'USER', userId: 'u-1' });
    expect(r).toEqual({ assignment: { type: 'USER', userId: 'u-1' }, assigneeUserIds: ['u-1'], claimMode: 'DIRECT' });
  });

  it('ROLE assignment returns all active users with that role', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
    const r = await resolver.resolveAssignment({ type: 'ROLE', roleCode: 'leader' });
    expect(r.assigneeUserIds).toEqual(['u-1', 'u-2']);
    expect(r.assigneeRoleCode).toBe('leader');
    expect(r.claimMode).toBe('CLAIMABLE');
  });

  it('DEPARTMENT_ROLE filters by department + role', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u-9' }]);
    const r = await resolver.resolveAssignment({ type: 'DEPARTMENT_ROLE', departmentId: 'd-1', roleCode: 'leader' });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { status: 'active', departmentId: 'd-1', roleObj: { code: 'leader' } },
      select: { id: true },
    });
    expect(r.assigneeUserIds).toEqual(['u-9']);
    expect(r.assigneeDepartmentId).toBe('d-1');
  });

  it('assertCanAct: admin always allowed', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'admin' }, departmentId: null });
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: null, assigneeRoleCode: null, assigneeDepartmentId: null, status: 'PENDING' },
    })).resolves.not.toThrow();
  });

  it('assertCanAct: matches assigneeUserId', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'user' }, departmentId: 'd-1' });
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: 'u-x', assigneeRoleCode: null, assigneeDepartmentId: null, status: 'PENDING' },
    })).resolves.not.toThrow();
  });

  it('assertCanAct: matches assigneeRoleCode', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'leader' }, departmentId: 'd-1' });
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: null, assigneeRoleCode: 'leader', assigneeDepartmentId: null, status: 'PENDING' },
    })).resolves.not.toThrow();
  });

  it('assertCanAct: DEPARTMENT_ROLE requires both department AND role match', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'leader' }, departmentId: 'd-1' });
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: null, assigneeRoleCode: 'leader', assigneeDepartmentId: 'd-1', status: 'PENDING' },
    })).resolves.not.toThrow();
    // wrong department
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: null, assigneeRoleCode: 'leader', assigneeDepartmentId: 'd-2', status: 'PENDING' },
    })).rejects.toThrow();
  });

  it('does not read userPermissions / permissionCode under any branch', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'user' }, departmentId: 'd-1' });
    await resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: 'u-x', assigneeRoleCode: null, assigneeDepartmentId: null, status: 'PENDING' },
    });
    const call = prisma.user.findUnique.mock.calls[0][0];
    expect(JSON.stringify(call)).not.toContain('userPermissions');
    expect(JSON.stringify(call)).not.toContain('fineGrainedPermission');
  });
});
