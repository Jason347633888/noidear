import { NotFoundException } from '@nestjs/common';
import { ApprovalCallbackRegistry } from './approval-callback.registry';

describe('ApprovalCallbackRegistry', () => {
  it('registers and invokes a callback', async () => {
    const registry = new ApprovalCallbackRegistry();
    const cb = jest.fn().mockResolvedValue(undefined);
    registry.register('process.stepApproved', cb);

    await registry.invoke('process.stepApproved', {
      tx: {} as any,
      instanceId: 'i1',
      resourceType: 'process_instance',
      resourceId: 'p1',
      triggerKey: 'step:1',
      actorId: 'u1',
    });

    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 'p1' }));
  });

  it('fails when callback key is missing', async () => {
    const registry = new ApprovalCallbackRegistry();
    await expect(
      registry.invoke('missing.key', {
        tx: {} as any,
        instanceId: 'i1',
        resourceType: 'document',
        resourceId: 'd1',
        triggerKey: 'publish',
        actorId: 'u1',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
