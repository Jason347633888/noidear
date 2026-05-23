import { ConflictException } from '@nestjs/common';
import { TaskService } from './task.service';
import { OwnershipContext } from '../module-access/ownership-context';

describe('TaskService.submit', () => {
  const makePrisma = () => ({
    user: { findUnique: jest.fn() },
    task: { findUnique: jest.fn(), update: jest.fn() },
    taskRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notification: { createMany: jest.fn() },
  });

  const makeApprovalEngine = () => ({
    startApproval: jest.fn(),
  });

  beforeEach(() => jest.clearAllMocks());

  it('starts a unified approval with resourceType=task_record and writes approvalInstanceId back', async () => {
    const prisma = makePrisma();
    const engine = makeApprovalEngine();
    const service = new TaskService(prisma as any, engine as any);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      departmentId: 'dept-1',
      roleObj: { code: 'member' },
    });
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      departmentId: 'dept-1',
      status: 'pending',
      templateId: 'tmpl-1',
      title: '巡检',
      template: { fieldsJson: [] },
    });
    prisma.taskRecord.findFirst.mockResolvedValue(null);
    prisma.taskRecord.create.mockResolvedValue({ id: 'rec-1' });
    engine.startApproval.mockResolvedValue({ id: 'approval-instance-1' });
    prisma.taskRecord.update.mockResolvedValue({
      id: 'rec-1',
      approvalInstanceId: 'approval-instance-1',
    });

    const result = await service.submit('task-1', { data: {} } as any, 'user-1');

    expect(engine.startApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'task_record',
        resourceId: 'rec-1',
        triggerKey: 'submit',
        resourceStep: 'submit',
        createdById: 'user-1',
      }),
    );
    expect(prisma.taskRecord.update).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      data: { approvalInstanceId: 'approval-instance-1' },
    });
    expect(result.approvalInstanceId).toBe('approval-instance-1');
  });

  it('propagates approval engine failure instead of silently swallowing it', async () => {
    const prisma = makePrisma();
    const engine = makeApprovalEngine();
    const service = new TaskService(prisma as any, engine as any);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      departmentId: 'dept-1',
      roleObj: { code: 'member' },
    });
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      departmentId: 'dept-1',
      status: 'pending',
      templateId: 'tmpl-1',
      title: '巡检',
      template: { fieldsJson: [] },
    });
    prisma.taskRecord.findFirst.mockResolvedValue(null);
    prisma.taskRecord.create.mockResolvedValue({ id: 'rec-2' });
    engine.startApproval.mockRejectedValue(new Error('definition missing'));

    await expect(
      service.submit('task-1', { data: {} } as any, 'user-1'),
    ).rejects.toThrow('definition missing');
  });

  it('blocks duplicate submission by the same user', async () => {
    const prisma = makePrisma();
    const service = new TaskService(prisma as any, undefined as any);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      departmentId: 'dept-1',
      roleObj: { code: 'member' },
    });
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      departmentId: 'dept-1',
      status: 'pending',
      templateId: 'tmpl-1',
      title: '巡检',
      template: { fieldsJson: [] },
    });
    prisma.taskRecord.findFirst.mockResolvedValue({ id: 'rec-existing' });

    await expect(
      service.submit('task-1', { data: {} } as any, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.taskRecord.create).not.toHaveBeenCalled();
  });

  it('writes the record without approval data when the engine is not available', async () => {
    const prisma = makePrisma();
    const service = new TaskService(prisma as any, undefined as any);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      departmentId: 'dept-1',
      roleObj: { code: 'member' },
    });
    prisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      departmentId: 'dept-1',
      status: 'pending',
      templateId: 'tmpl-1',
      title: '巡检',
      template: { fieldsJson: [] },
    });
    prisma.taskRecord.findFirst.mockResolvedValue(null);
    prisma.taskRecord.create.mockResolvedValue({ id: 'rec-3' });

    const result = await service.submit('task-1', { data: {} } as any, 'user-1');

    expect(result).toEqual({ id: 'rec-3' });
    expect(prisma.taskRecord.update).not.toHaveBeenCalled();
  });
});

describe('TaskService.listForUser ownership', () => {
  const makePrisma = () => ({
    user: { findUnique: jest.fn() },
    task: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    taskRecord: { findFirst: jest.fn() },
    notification: { createMany: jest.fn() },
  });

  beforeEach(() => jest.clearAllMocks());

  it('admin sees all tasks (no where clause)', async () => {
    const prisma = makePrisma();
    const service = new TaskService(prisma as any, null as any);
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await service.listForUser(ownership, {});
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('user sees only tasks in their own department', async () => {
    const prisma = makePrisma();
    const service = new TaskService(prisma as any, null as any);
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-x', managedDepartmentIds: [] };
    await service.listForUser(ownership, {});
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ creatorId: 'u-1' }) }),
    );
  });

  it('leader sees tasks of managed departments', async () => {
    const prisma = makePrisma();
    const service = new TaskService(prisma as any, null as any);
    const ownership: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1', 'd-2'] };
    await service.listForUser(ownership, {});
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ departmentId: { in: ['d-1', 'd-2'] } }) }),
    );
  });
});
