import { ApprovalInstanceController } from './approval-instance.controller';
import { OwnershipContext } from '../module-access/ownership-context';

function buildCtx(ownership: OwnershipContext) {
  const req: any = { user: { id: ownership.userId }, ownership };
  return {
    req,
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any,
  };
}

describe('ApprovalInstanceController.findAll ownership', () => {
  function freshController(opts: { instances?: any[] } = {}) {
    const instances = opts.instances ?? [];
    const prisma = {
      approvalInstance: {
        findMany: jest.fn().mockResolvedValue(instances),
      },
    } as any;
    const engine = {} as any;
    const controller = new ApprovalInstanceController(prisma, engine);
    return { controller, prisma };
  }

  beforeEach(() => jest.clearAllMocks());

  it('admin sees all instances (no createdById filter)', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await controller.findAll(ownership);
    expect(prisma.approvalInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('user sees only instances they created', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-x', managedDepartmentIds: [] };
    await controller.findAll(ownership);
    expect(prisma.approvalInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: 'u-1' } }),
    );
  });

  it('leader sees instances created by members of managed depts', async () => {
    const { controller, prisma } = freshController();
    prisma.user = { findMany: jest.fn().mockResolvedValue([{ id: 'm-1' }, { id: 'm-2' }]) };
    const ownership: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await controller.findAll(ownership);
    expect(prisma.approvalInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: { in: ['m-1', 'm-2'] } } }),
    );
  });
});
