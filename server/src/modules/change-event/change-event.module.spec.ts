import { ChangeEventModule } from './change-event.module';

describe('ChangeEventModule approval callback wiring', () => {
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

  it("registers 'changeEvent.approvalApproved' and 'changeEvent.approvalRejected' callbacks", () => {
    const { registered } = instantiateAndInit();
    expect(registered.has('changeEvent.approvalApproved')).toBe(true);
    expect(registered.has('changeEvent.approvalRejected')).toBe(true);
  });

  it('approved callback updates change_event status and dispatches applyApprovedChange (no legacy changeApproval write)', async () => {
    const { registered, productProcessChangeService } = instantiateAndInit();

    const tx = {
      changeEvent: { update: jest.fn().mockResolvedValue({ id: 'change-1', status: 'approved' }) },
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

    expect(tx.changeEvent.update).toHaveBeenCalledWith({
      where: { id: 'change-1' },
      data: { status: 'approved', approved_by: 'approver-1' },
    });
    expect(productProcessChangeService.applyApprovedChange).toHaveBeenCalledWith(
      'change-1',
      'approver-1',
      tx,
    );
  });

  it('rejected callback marks change_event rejected without touching applyApprovedChange', async () => {
    const { registered, productProcessChangeService } = instantiateAndInit();

    const tx = {
      changeEvent: { update: jest.fn().mockResolvedValue({ id: 'change-1', status: 'rejected' }) },
    };

    const cb = registered.get('changeEvent.approvalRejected')!;
    await cb({
      tx,
      instanceId: 'inst-1',
      resourceType: 'change_event',
      resourceId: 'change-1',
      triggerKey: 'approve_change',
      actorId: 'approver-1',
      comment: '不符合',
    });

    expect(tx.changeEvent.update).toHaveBeenCalledWith({
      where: { id: 'change-1' },
      data: { status: 'rejected', approved_by: 'approver-1' },
    });
    expect(productProcessChangeService.applyApprovedChange).not.toHaveBeenCalled();
  });
});
