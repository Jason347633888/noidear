import { ForbiddenException } from '@nestjs/common';
import { ApprovalInstanceController } from './approval-instance.controller';
import { OwnershipContext } from '../module-access/ownership-context';

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

describe('ApprovalInstanceController.findByResource ownership', () => {
  function freshController(instances: any[] = []) {
    const prisma = {
      approvalInstance: {
        findMany: jest.fn().mockResolvedValue(instances),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const engine = {} as any;
    const controller = new ApprovalInstanceController(prisma, engine);
    return { controller, prisma };
  }

  beforeEach(() => jest.clearAllMocks());

  it('admin can access all instances for a resource', async () => {
    const instances = [
      { id: 'i-1', createdById: 'u-1', resourceType: 'order', resourceId: 'r-1' },
      { id: 'i-2', createdById: 'u-2', resourceType: 'order', resourceId: 'r-1' },
    ];
    const { controller } = freshController(instances);
    const ownership: OwnershipContext = { userId: 'admin-1', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await controller.findByResource('order', 'r-1', ownership);
    expect(result).toHaveLength(2);
  });

  it('user can access their own instances for a resource', async () => {
    const instances = [
      { id: 'i-1', createdById: 'u-1', resourceType: 'order', resourceId: 'r-1' },
      { id: 'i-2', createdById: 'u-2', resourceType: 'order', resourceId: 'r-1' },
    ];
    const { controller } = freshController(instances);
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await controller.findByResource('order', 'r-1', ownership);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i-1');
  });

  it('user cannot access others instances for a resource (filtered out, not 403)', async () => {
    const instances = [
      { id: 'i-2', createdById: 'u-2', resourceType: 'order', resourceId: 'r-1' },
    ];
    const { controller } = freshController(instances);
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await controller.findByResource('order', 'r-1', ownership);
    expect(result).toHaveLength(0);
  });
});

describe('ApprovalInstanceController.findOne ownership', () => {
  function freshController(instance: any | null) {
    const prisma = {
      approvalInstance: {
        findUnique: jest.fn().mockResolvedValue(instance),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const engine = {} as any;
    const controller = new ApprovalInstanceController(prisma, engine);
    return { controller, prisma };
  }

  beforeEach(() => jest.clearAllMocks());

  it('admin can access any approval instance by id', async () => {
    const instance = { id: 'i-1', createdById: 'u-other' };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'admin-1', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await controller.findOne('i-1', ownership);
    expect(result).toEqual(instance);
  });

  it('user can access their own approval instance by id', async () => {
    const instance = { id: 'i-1', createdById: 'u-1' };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await controller.findOne('i-1', ownership);
    expect(result).toEqual(instance);
  });

  it('user cannot access others approval instance (throws ForbiddenException, not NotFoundException)', async () => {
    const instance = { id: 'i-1', createdById: 'u-other' };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    await expect(controller.findOne('i-1', ownership)).rejects.toThrow(ForbiddenException);
  });
});
