import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { ProductRecallModule } from './product-recall.module';

describe('ProductRecallModule approval callbacks', () => {
  const registry = new ApprovalCallbackRegistry();
  const service: any = {
    markApprovalApprovedFromCallback: jest.fn(),
    markApprovalRejectedFromCallback: jest.fn(),
  };
  const module = new ProductRecallModule(registry, service);
  module.onModuleInit();

  beforeEach(() => jest.clearAllMocks());

  it('registers product recall approval callbacks under seed keys', () => {
    expect(registry.has('productRecall.approvalApproved')).toBe(true);
    expect(registry.has('productRecall.approvalRejected')).toBe(true);
  });

  it('approved callback forwards the approval transaction client and review_note metadata to the service', async () => {
    const tx = { productRecall: { findUnique: jest.fn(), update: jest.fn() } } as any;

    await registry.invoke('productRecall.approvalApproved', {
      tx,
      resourceId: 'recall-1',
      actorId: 'approver-1',
      comment: 'OK',
      metadata: { review_note: '风险可控' },
    } as any);

    expect(service.markApprovalApprovedFromCallback).toHaveBeenCalledWith(
      tx,
      'recall-1',
      'approver-1',
      '风险可控',
    );
  });

  it('rejected callback forwards tx and prefers metadata.review_note but falls back to comment', async () => {
    const tx = { productRecall: { findUnique: jest.fn(), update: jest.fn() } } as any;

    await registry.invoke('productRecall.approvalRejected', {
      tx,
      resourceId: 'recall-1',
      actorId: 'approver-1',
      comment: '驳回理由',
      metadata: {},
    } as any);

    expect(service.markApprovalRejectedFromCallback).toHaveBeenCalledWith(
      tx,
      'recall-1',
      'approver-1',
      '驳回理由',
    );

    jest.clearAllMocks();
    await registry.invoke('productRecall.approvalRejected', {
      tx,
      resourceId: 'recall-1',
      actorId: 'approver-1',
      comment: '驳回理由',
      metadata: { review_note: '证据不足' },
    } as any);

    expect(service.markApprovalRejectedFromCallback).toHaveBeenCalledWith(
      tx,
      'recall-1',
      'approver-1',
      '证据不足',
    );
  });
});
