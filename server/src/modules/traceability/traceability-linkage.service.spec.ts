import { TraceabilityLinkageService } from './traceability-linkage.service';

const mockProductRecallService = { create: jest.fn() };

describe('TraceabilityLinkageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a linkage payload with created status for standard action types', async () => {
    const service = new TraceabilityLinkageService(mockProductRecallService as any);

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
    mockProductRecallService.create.mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' });
    const service = new TraceabilityLinkageService(mockProductRecallService as any);

    const result = await service.create(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz' },
      { id: 'user-2' } as any,
    );

    expect(result.status).toBe('pendingReview');
  });

  it('falls back to system requestedBy when user id is absent', async () => {
    const service = new TraceabilityLinkageService(mockProductRecallService as any);

    const result = await service.create(
      { actionType: 'capa', sourceQueryRef: 'hash-001' },
      null as any,
    );

    expect(result.requestedBy).toBe('system');
  });

  it('creates ProductRecall draft for recallAssessment actions', async () => {
    const productRecallService = {
      create: jest.fn().mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' }),
    };
    const service = new TraceabilityLinkageService(productRecallService as any);

    const result = await service.create(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz', note: '高风险批次' },
      { id: 'user-1', companyId: 'company-1' },
    );

    expect(productRecallService.create).toHaveBeenCalledWith(expect.objectContaining({
      title: '追溯召回评估',
      reason: '高风险批次',
      source_query_ref: 'hash-xyz',
    }), { id: 'user-1', companyId: 'company-1' });
    expect(result.productRecall).toEqual({ id: 'recall-1', recall_no: 'RC-2026-0001' });
  });
});
