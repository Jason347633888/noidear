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
    const instance = { id: 'i-1', createdById: 'u-other', tasks: [] };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'admin-1', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await controller.findOne('i-1', ownership);
    expect(result).toEqual(instance);
  });

  it('user can access their own approval instance by id', async () => {
    const instance = { id: 'i-1', createdById: 'u-1', tasks: [] };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await controller.findOne('i-1', ownership);
    expect(result).toEqual(instance);
  });

  it('user cannot access others approval instance (throws ForbiddenException, not NotFoundException)', async () => {
    const instance = { id: 'i-1', createdById: 'u-other', tasks: [] };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    await expect(controller.findOne('i-1', ownership)).rejects.toThrow(ForbiddenException);
  });

  it('ROLE-type approver (matching assigneeUserId) can access instance they did not create', async () => {
    const instance = {
      id: 'i-1',
      createdById: 'u-creator',
      tasks: [{ assigneeUserId: 'u-approver', assigneeRoleCode: null, assigneeDepartmentId: null }],
    };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'u-approver', roleCode: 'user', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await controller.findOne('i-1', ownership);
    expect(result).toEqual(instance);
  });

  it('ROLE-type approver (matching assigneeRoleCode) can access instance they did not create', async () => {
    const instance = {
      id: 'i-1',
      createdById: 'u-creator',
      tasks: [{ assigneeUserId: null, assigneeRoleCode: 'leader', assigneeDepartmentId: null }],
    };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'u-leader', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    const result = await controller.findOne('i-1', ownership);
    expect(result).toEqual(instance);
  });

  it('DEPT_ROLE-type approver (matching assigneeDepartmentId) can access instance they did not create', async () => {
    const instance = {
      id: 'i-1',
      createdById: 'u-creator',
      tasks: [{ assigneeUserId: null, assigneeRoleCode: null, assigneeDepartmentId: 'd-approver' }],
    };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'u-dept-member', roleCode: 'user', departmentId: 'd-approver', managedDepartmentIds: [] };
    const result = await controller.findOne('i-1', ownership);
    expect(result).toEqual(instance);
  });

  it('unrelated user with no creator or task candidate status cannot access instance (403)', async () => {
    const instance = {
      id: 'i-1',
      createdById: 'u-creator',
      tasks: [{ assigneeUserId: 'u-other-approver', assigneeRoleCode: 'leader', assigneeDepartmentId: 'd-other' }],
    };
    const { controller } = freshController(instance);
    const ownership: OwnershipContext = { userId: 'u-unrelated', roleCode: 'user', departmentId: 'd-unrelated', managedDepartmentIds: [] };
    await expect(controller.findOne('i-1', ownership)).rejects.toThrow(ForbiddenException);
  });
});

describe('ApprovalInstanceController.findByResource task-candidate expansion', () => {
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

  it('ROLE-type approver (matching assigneeRoleCode) can see instance in findByResource', async () => {
    const instances = [
      {
        id: 'i-1',
        createdById: 'u-creator',
        resourceType: 'order',
        resourceId: 'r-1',
        tasks: [{ assigneeUserId: null, assigneeRoleCode: 'leader', assigneeDepartmentId: null }],
      },
      {
        id: 'i-2',
        createdById: 'u-other',
        resourceType: 'order',
        resourceId: 'r-1',
        tasks: [{ assigneeUserId: null, assigneeRoleCode: 'user', assigneeDepartmentId: null }],
      },
    ];
    const { controller } = freshController(instances);
    const ownership: OwnershipContext = { userId: 'u-leader', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    const result = await controller.findByResource('order', 'r-1', ownership);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i-1');
  });

  it('DEPT_ROLE-type approver (matching assigneeDepartmentId) can see instance in findByResource', async () => {
    const instances = [
      {
        id: 'i-1',
        createdById: 'u-creator',
        resourceType: 'order',
        resourceId: 'r-1',
        tasks: [{ assigneeUserId: null, assigneeRoleCode: null, assigneeDepartmentId: 'd-approver' }],
      },
    ];
    const { controller } = freshController(instances);
    const ownership: OwnershipContext = { userId: 'u-dept-member', roleCode: 'user', departmentId: 'd-approver', managedDepartmentIds: [] };
    const result = await controller.findByResource('order', 'r-1', ownership);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i-1');
  });

  it('unrelated user with no creator or task candidate status cannot see instance in findByResource', async () => {
    const instances = [
      {
        id: 'i-1',
        createdById: 'u-creator',
        resourceType: 'order',
        resourceId: 'r-1',
        tasks: [{ assigneeUserId: 'u-other-approver', assigneeRoleCode: 'leader', assigneeDepartmentId: 'd-other' }],
      },
    ];
    const { controller } = freshController(instances);
    const ownership: OwnershipContext = { userId: 'u-unrelated', roleCode: 'user', departmentId: 'd-unrelated', managedDepartmentIds: [] };
    const result = await controller.findByResource('order', 'r-1', ownership);
    expect(result).toHaveLength(0);
  });
});
