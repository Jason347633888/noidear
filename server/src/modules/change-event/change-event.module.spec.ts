import { ChangeEventModule } from './change-event.module';

describe('ChangeEventModule approvalApproved callback wiring', () => {
  function instantiateAndInit() {
    const registered = new Map<string, (ctx: any) => Promise<void>>();
    const callbacks: any = {
      register: jest.fn((key: string, cb: any) => registered.set(key, cb)),
    };
    const productProcessChangeService: any = {
      applyApprovedChange: jest.fn().mockResolvedValue(undefined),
    };

    // Hand-construct the module instance — Nest DI is overkill for asserting
    // the on-init callback shape and would require a full TestingModule.
    const moduleInstance = new (ChangeEventModule as any)(callbacks, productProcessChangeService);
    moduleInstance.onModuleInit();

    return { registered, callbacks, productProcessChangeService };
  }

  it("registers a 'changeEvent.approvalApproved' callback", () => {
    const { registered } = instantiateAndInit();
    expect(registered.has('changeEvent.approvalApproved')).toBe(true);
  });

  it('callback updates legacy approval row AND dispatches applyApprovedChange', async () => {
    const { registered, productProcessChangeService } = instantiateAndInit();

    const tx = {
      changeApproval: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };

    const cb = registered.get('changeEvent.approvalApproved')!;
    await cb({
      tx,
      instanceId: 'inst-1',
      resourceType: 'change_event',
      resourceId: 'change-1',
      triggerKey: 'approve_change',
      actorId: 'approver-1',
      comment: 'ok',
    });

    expect(tx.changeApproval.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { change_event_id: 'change-1' },
        data: expect.objectContaining({ decision: 'approved', approver_id: 'approver-1' }),
      }),
    );
    expect(productProcessChangeService.applyApprovedChange).toHaveBeenCalledWith(
      'change-1',
      'approver-1',
      tx,
    );
  });
});
