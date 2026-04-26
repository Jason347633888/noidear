import { ApprovalTodoBridge } from './approval-todo.bridge';

describe('ApprovalTodoBridge', () => {
  it('creates one todo per direct approval task', async () => {
    const prisma = {
      todoTask: { create: jest.fn(), updateMany: jest.fn() },
      approvalTask: { findUnique: jest.fn() },
    } as any;
    const bridge = new ApprovalTodoBridge(prisma);

    await bridge.createTaskTodos({
      tx: prisma,
      task: { id: 'task-1', assigneeUserId: 'user-1', stepName: '审批', instance: { title: '标题' } },
      candidateUserIds: ['user-1'],
    });

    expect(prisma.todoTask.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'approval_task',
        relatedId: 'task-1',
        title: '审批：标题',
        status: 'pending',
      }),
    });
  });

  it('closes all todos for a completed approval task', async () => {
    const prisma = {
      todoTask: { create: jest.fn(), updateMany: jest.fn() },
      approvalTask: { findUnique: jest.fn() },
    } as any;
    const bridge = new ApprovalTodoBridge(prisma);

    await bridge.closeTaskTodos(prisma, 'task-1', 'user-1');

    expect(prisma.todoTask.updateMany).toHaveBeenCalledWith({
      where: { type: 'approval_task', relatedId: 'task-1', status: 'pending' },
      data: { status: 'completed', completedAt: expect.any(Date), completedBy: 'user-1' },
    });
  });
});
