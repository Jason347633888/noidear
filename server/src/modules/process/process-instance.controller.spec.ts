/**
 * Task 39 — ProcessInstanceController.findAll ownership
 * ProcessInstance.createdById is the user FK.
 */
import { ProcessInstanceController } from './process-instance.controller';
import { OwnershipContext } from '../module-access/ownership-context';

function freshController(memberIds: string[] = []) {
  const prisma: any = {
    processInstance: { findMany: jest.fn().mockResolvedValue([]) },
    product: { findFirst: jest.fn() },
    processTemplate: { findUnique: jest.fn() },
    processStepData: { upsert: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const engine: any = {};
  const controller = new ProcessInstanceController(prisma, engine);
  return { controller, prisma };
}

function makeReq(ownership: OwnershipContext) {
  return { user: { id: ownership.userId }, ownership } as any;
}

describe('ProcessInstanceController.findAll ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all instances (no createdById filter)', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await controller.findAll(makeReq(ownership));
    expect(prisma.processInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('user sees only instances they created', async () => {
    const { controller, prisma } = freshController();
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await controller.findAll(makeReq(ownership));
    expect(prisma.processInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: 'u-1' } }),
    );
  });

  it('leader sees instances created by managed-dept members', async () => {
    const { controller, prisma } = freshController(['m-1', 'm-2']);
    const ownership: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await controller.findAll(makeReq(ownership));
    expect(prisma.processInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: { in: ['m-1', 'm-2'] } } }),
    );
  });
});
