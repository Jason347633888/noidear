import { ApprovalTaskController } from './approval-task.controller';
import { OwnershipContext } from '../module-access/ownership-context';

/**
 * Ownership-scoped visibility tests for ApprovalTaskController.findMyPending
 *
 * Covers the P0-R6-1 fix: ROLE-type and DEPARTMENT_ROLE-type tasks must be visible
 * to users/leaders whose roleCode/departmentId match the task assignment.
 */
describe('ApprovalTaskController.findMyPending — ownership scope', () => {
  function freshController(opts: { pendingTasks?: any[]; memberIds?: string[] } = {}) {
    const tasks = opts.pendingTasks ?? [];
    const members = (opts.memberIds ?? []).map((id) => ({ id }));
    const prisma = {
      approvalTask: {
        findMany: jest.fn().mockResolvedValue(tasks),
      },
      user: {
        findMany: jest.fn().mockResolvedValue(members),
      },
    } as any;
    const engine = {} as any;
    const resolver = {
      assertCanAct: jest.fn().mockResolvedValue(undefined),
    } as any;
    const controller = new ApprovalTaskController(prisma, engine, resolver);
    return { controller, prisma, resolver };
  }

  function makeReq(ownership: OwnershipContext) {
    return { user: { id: ownership.userId }, ownership } as any;
  }

  beforeEach(() => jest.clearAllMocks());

  // ── admin ──────────────────────────────────────────────────────────────
  it('admin: sees ALL tasks — no assigneeUserId or assigneeDepartmentId filter applied', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = {
      userId: 'admin-1',
      roleCode: 'admin',
      departmentId: null,
      managedDepartmentIds: undefined,
    };
    await controller.findMyPending(makeReq(ownership));
    const where = prisma.approvalTask.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('assigneeUserId');
    expect(where).not.toHaveProperty('assigneeDepartmentId');
    expect(where).not.toHaveProperty('OR');
  });

  // ── user ───────────────────────────────────────────────────────────────
  it('user: sees own DIRECT tasks (assigneeUserId = userId)', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = {
      userId: 'u-1',
      roleCode: 'user',
      departmentId: 'd-x',
      managedDepartmentIds: [],
    };
    await controller.findMyPending(makeReq(ownership));
    const where = prisma.approvalTask.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([{ assigneeUserId: 'u-1' }]),
    );
  });

  it('user: sees ROLE-type tasks where assigneeRoleCode matches roleCode', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = {
      userId: 'u-1',
      roleCode: 'user',
      departmentId: 'd-x',
      managedDepartmentIds: [],
    };
    await controller.findMyPending(makeReq(ownership));
    const where = prisma.approvalTask.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([{ assigneeUserId: null, assigneeRoleCode: 'user' }]),
    );
  });

  // ── leader ─────────────────────────────────────────────────────────────
  it('leader: sees DIRECT tasks (assigneeUserId = userId)', async () => {
    const { controller, prisma } = freshController({ memberIds: ['m-1'] });
    const ownership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'd-1',
      managedDepartmentIds: ['d-1'],
    };
    await controller.findMyPending(makeReq(ownership));
    const where = prisma.approvalTask.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([{ assigneeUserId: 'l-1' }]),
    );
  });

  it('leader: sees ROLE-type tasks where assigneeRoleCode matches roleCode', async () => {
    const { controller, prisma } = freshController({ memberIds: ['m-1'] });
    const ownership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'd-1',
      managedDepartmentIds: ['d-1'],
    };
    await controller.findMyPending(makeReq(ownership));
    const where = prisma.approvalTask.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([{ assigneeUserId: null, assigneeRoleCode: 'leader' }]),
    );
  });

  it('leader: sees DEPT_ROLE tasks where assigneeDepartmentId matches departmentId', async () => {
    const { controller, prisma } = freshController({ memberIds: ['m-1'] });
    const ownership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'd-1',
      managedDepartmentIds: ['d-1'],
    };
    await controller.findMyPending(makeReq(ownership));
    const where = prisma.approvalTask.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([{ assigneeUserId: null, assigneeDepartmentId: 'd-1' }]),
    );
  });

  it('leader: sees tasks assigned to managed dept members', async () => {
    const { controller, prisma } = freshController({ memberIds: ['m-1', 'm-2'] });
    const ownership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'd-1',
      managedDepartmentIds: ['d-1'],
    };
    await controller.findMyPending(makeReq(ownership));
    const where = prisma.approvalTask.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([{ assigneeUserId: { in: ['m-1', 'm-2'] } }]),
    );
  });

  it('assertCanAct guard is called for each row returned from DB', async () => {
    const tasks = [
      { id: 't-1', assigneeUserId: 'l-1' },
      { id: 't-2', assigneeUserId: null, assigneeRoleCode: 'leader' },
    ];
    const { controller, resolver } = freshController({ pendingTasks: tasks });
    const ownership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'd-1',
      managedDepartmentIds: ['d-1'],
    };
    await controller.findMyPending(makeReq(ownership));
    expect(resolver.assertCanAct).toHaveBeenCalledTimes(2);
  });
});
