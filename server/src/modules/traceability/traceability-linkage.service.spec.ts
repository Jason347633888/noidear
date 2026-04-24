import { TraceabilityLinkageService } from './traceability-linkage.service';

describe('TraceabilityLinkageService', () => {
  it('creates a linkage payload with created status for standard action types', async () => {
    const service = new TraceabilityLinkageService();

    const result = await service.create(
      { actionType: 'deviation', sourceQueryRef: 'hash-abc', note: '有异常' },
      { id: 'user-1', department: '品质' } as any,
    );

    expect(result).toMatchObject({
      actionType: 'deviation',
      sourceQueryRef: 'hash-abc',
      requestedBy: 'user-1',
      note: '有异常',
      status: 'created',
    });
    expect(result.writeback.linkedAt).toBeDefined();
  });

  it('sets pendingReview status for recallAssessment actions', async () => {
    const service = new TraceabilityLinkageService();

    const result = await service.create(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz' },
      { id: 'user-2' } as any,
    );

    expect(result.status).toBe('pendingReview');
  });

  it('falls back to system requestedBy when user id is absent', async () => {
    const service = new TraceabilityLinkageService();

    const result = await service.create(
      { actionType: 'capa', sourceQueryRef: 'hash-001' },
      null as any,
    );

    expect(result.requestedBy).toBe('system');
  });
});
