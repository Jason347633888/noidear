import { ForbiddenException } from '@nestjs/common';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    ...overrides,
  } as any;
}

describe('ApprovalAssignmentResolver', () => {
  it('resolves a direct user assignment', async () => {
    const prisma = makePrisma();
    const resolver = new ApprovalAssignmentResolver(prisma);

    const result = await resolver.resolveAssignment({ type: 'user', userId: 'u1' });

    expect(result.assigneeUserIds).toEqual(['u1']);
    expect(result.claimMode).toBe('DIRECT');
  });

  it('resolves role assignments from active users', async () => {
    const prisma = makePrisma();
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    const resolver = new ApprovalAssignmentResolver(prisma);

    const result = await resolver.resolveAssignment({ type: 'role', roleCode: 'quality_manager' });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        status: 'active',
        OR: [{ role: 'quality_manager' }, { roleObj: { code: 'quality_manager' } }],
      },
      select: { id: true },
    });
    expect(result).toMatchObject({
      assigneeUserIds: ['u1', 'u2'],
      assigneeRoleCode: 'quality_manager',
      claimMode: 'CLAIMABLE',
    });
  });

  it('does not trust a client role when authorizing a task', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'user',
      roleObj: { code: 'user' },
      departmentId: 'dept-user',
      userPermissions: [],
    });
    const resolver = new ApprovalAssignmentResolver(prisma);

    await expect(
      resolver.assertCanAct({
        userId: 'u1',
        task: {
          assigneeUserId: null,
          assigneeRoleCode: 'gm',
          assigneeDepartmentId: null,
          assigneePermissionCode: null,
          status: 'PENDING',
        },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows admin override', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      role: 'admin',
      roleObj: { code: 'admin' },
      departmentId: null,
      userPermissions: [],
    });
    const resolver = new ApprovalAssignmentResolver(prisma);

    await expect(
      resolver.assertCanAct({
        userId: 'admin',
        task: {
          assigneeUserId: null,
          assigneeRoleCode: 'gm',
          assigneeDepartmentId: null,
          assigneePermissionCode: null,
          status: 'PENDING',
        },
      }),
    ).resolves.toBeUndefined();
  });
});
