import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalEngineService } from './approval-engine.service';

function makeDeps() {
  const tx: any = {
    approvalDefinition: { findFirst: jest.fn() },
    approvalInstance: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    approvalTask: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    approvalAction: { create: jest.fn() },
  };
  const prisma: any = {
    $transaction: jest.fn((fn) => fn(tx)),
    ...tx,
  };
  const resolver: any = {
    resolveAssignment: jest.fn(),
    assertCanAct: jest.fn(),
  };
  const todo: any = { createTaskTodos: jest.fn(), closeTaskTodos: jest.fn(), cancelInstanceTodos: jest.fn() };
  const notification: any = { notifyTaskCreated: jest.fn(), notifyRequester: jest.fn() };
  const callbacks: any = { invoke: jest.fn() };
  return { tx, prisma, resolver, todo, notification, callbacks };
}

describe('ApprovalEngineService', () => {
  it('starts an approval and creates first-step tasks', async () => {
    const deps = makeDeps();
    deps.tx.approvalDefinition.findFirst.mockResolvedValue({
      id: 'def-1',
      version: 2,
      steps: [{ stepKey: 's1', stepName: '审批', mode: 'single', assignments: [{ type: 'user', userId: 'u2' }], onApproved: 'x.done' }],
    });
    deps.resolver.resolveAssignment.mockResolvedValue({ assigneeUserIds: ['u2'], claimMode: 'DIRECT' });
    deps.tx.approvalInstance.create.mockResolvedValue({ id: 'inst-1', title: '标题' });
    deps.tx.approvalTask.create.mockResolvedValue({ id: 'task-1', assigneeUserId: 'u2', stepName: '审批', instance: { title: '标题' } });

    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);
    const result = await service.startApproval({
      resourceType: 'document',
      resourceId: 'doc-1',
      triggerKey: 'publish.level1',
      title: '标题',
      createdById: 'u1',
    });

    expect(result.id).toBe('inst-1');
    expect(deps.tx.approvalTask.create).toHaveBeenCalled();
    expect(deps.todo.createTaskTodos).toHaveBeenCalled();
    expect(deps.notification.notifyTaskCreated).toHaveBeenCalledWith(['u2'], '标题', 'task-1');
  });

  it('rejects start when definition is missing', async () => {
    const deps = makeDeps();
    deps.tx.approvalDefinition.findFirst.mockResolvedValue(null);
    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);

    await expect(
      service.startApproval({ resourceType: 'document', resourceId: 'd1', triggerKey: 'missing', title: '标题', createdById: 'u1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('approves a single task and invokes onApproved callback', async () => {
    const deps = makeDeps();
    deps.tx.approvalTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'PENDING',
      stepKey: 's1',
      approvalMode: 'single',
      instance: {
        id: 'inst-1',
        title: '标题',
        resourceType: 'document',
        resourceId: 'doc-1',
        resourceStep: null,
        triggerKey: 'publish.level1',
        createdById: 'creator',
        definition: { steps: [{ stepKey: 's1', onApproved: 'document.approvalApproved' }] },
      },
    });
    deps.tx.approvalTask.findMany.mockResolvedValue([]);

    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);
    await service.approveTask('task-1', 'approver', '通过');

    expect(deps.resolver.assertCanAct).toHaveBeenCalled();
    expect(deps.tx.approvalTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'APPROVED', actedById: 'approver', claimedById: 'approver', comment: '通过', actedAt: expect.any(Date) },
    });
    expect(deps.callbacks.invoke).toHaveBeenCalledWith('document.approvalApproved', expect.objectContaining({ resourceId: 'doc-1' }));
  });

  it('rejects an already completed task', async () => {
    const deps = makeDeps();
    deps.tx.approvalTask.findUnique.mockResolvedValue({ id: 'task-1', status: 'APPROVED', instance: {} });
    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);

    await expect(service.approveTask('task-1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('invokes onRejected callback when step defines one', async () => {
    const deps = makeDeps();
    deps.tx.approvalTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'PENDING',
      stepKey: 's1',
      approvalMode: 'single',
      instanceId: 'inst-1',
      instance: {
        id: 'inst-1',
        title: '标题',
        resourceType: 'document',
        resourceId: 'doc-1',
        resourceStep: null,
        triggerKey: 'publish.level2',
        createdById: 'creator',
        definition: {
          steps: [{ stepKey: 's1', onApproved: 'document.approvalApproved', onRejected: 'document.approvalRejected' }],
        },
      },
    });

    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);
    await service.rejectTask('task-1', 'approver', '不符合要求');

    expect(deps.tx.approvalInstance.update).toHaveBeenCalledWith({
      where: { id: 'inst-1' },
      data: { status: 'REJECTED', completedAt: expect.any(Date) },
    });
    expect(deps.callbacks.invoke).toHaveBeenCalledWith(
      'document.approvalRejected',
      expect.objectContaining({ resourceId: 'doc-1', actorId: 'approver', comment: '不符合要求' }),
    );
    expect(deps.notification.notifyRequester).toHaveBeenCalledWith('creator', 'rejected', '标题');
  });

  it('does not invoke any callback when onRejected is absent', async () => {
    const deps = makeDeps();
    deps.tx.approvalTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'PENDING',
      stepKey: 's1',
      approvalMode: 'single',
      instanceId: 'inst-1',
      instance: {
        id: 'inst-1',
        title: '标题',
        resourceType: 'document',
        resourceId: 'doc-1',
        resourceStep: null,
        triggerKey: 'publish.level2',
        createdById: 'creator',
        definition: {
          steps: [{ stepKey: 's1', onApproved: 'document.approvalApproved' }],
        },
      },
    });

    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);
    await service.rejectTask('task-1', 'approver', '不符合要求');

    expect(deps.callbacks.invoke).not.toHaveBeenCalled();
  });
});
