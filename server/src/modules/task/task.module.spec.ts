import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { TaskModule } from './task.module';

describe('TaskModule approval callbacks', () => {
  const registry = new ApprovalCallbackRegistry();
  const module = new TaskModule(registry);
  module.onModuleInit();

  it('registers approved and rejected callbacks under the seed keys', () => {
    expect(registry.has('taskRecord.approvalApproved')).toBe(true);
    expect(registry.has('taskRecord.approvalRejected')).toBe(true);
  });

  it('approvalApproved callback updates taskRecord and parent task to approved', async () => {
    const tx = {
      taskRecord: {
        update: jest.fn().mockResolvedValue({ taskId: 'task-1' }),
      },
      task: { update: jest.fn() },
    };
    await registry.invoke('taskRecord.approvalApproved', {
      tx,
      resourceId: 'rec-1',
      actorId: 'approver-1',
      comment: 'OK',
    } as any);

    expect(tx.taskRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rec-1' },
        data: expect.objectContaining({
          status: 'approved',
          approverId: 'approver-1',
          comment: 'OK',
        }),
      }),
    );
    expect(tx.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'approved' },
    });
  });

  it('approvalRejected callback updates taskRecord and parent task to rejected', async () => {
    const tx = {
      taskRecord: {
        update: jest.fn().mockResolvedValue({ taskId: 'task-1' }),
      },
      task: { update: jest.fn() },
    };
    await registry.invoke('taskRecord.approvalRejected', {
      tx,
      resourceId: 'rec-1',
      actorId: 'approver-1',
      comment: '不符合要求',
    } as any);

    expect(tx.taskRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'rejected',
          approverId: 'approver-1',
          comment: '不符合要求',
        }),
      }),
    );
    expect(tx.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'rejected' },
    });
  });
});
