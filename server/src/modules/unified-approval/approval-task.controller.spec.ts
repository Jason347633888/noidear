import { ApprovalTaskController } from './approval-task.controller';
import { OwnershipContext } from '../module-access/ownership-context';

describe('ApprovalTaskController.findMyPending ownership', () => {
  function freshController(opts: { pendingTasks?: any[] } = {}) {
    const tasks = opts.pendingTasks ?? [];
    const prisma = {
      approvalTask: {
        findMany: jest.fn().mockResolvedValue(tasks),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
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

  it('user: findMany filters assigneeUserId = userId', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-x', managedDepartmentIds: [] };
    await controller.findMyPending(makeReq(ownership));
    expect(prisma.approvalTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assigneeUserId: 'u-1' }) }),
    );
  });

  it('admin: findMany uses no user-scoped filter', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await controller.findMyPending(makeReq(ownership));
    const callArg = prisma.approvalTask.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty('assigneeUserId');
    expect(callArg.where).not.toHaveProperty('assigneeDepartmentId');
  });
});
