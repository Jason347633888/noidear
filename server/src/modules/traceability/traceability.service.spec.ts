import { TraceabilityService } from './traceability.service';

describe('TraceabilityService recall actions', () => {
  it('delegates recallAssessment actions to TraceabilityLinkageService', async () => {
    const linkageService = {
      create: jest.fn().mockResolvedValue({
        actionType: 'recallAssessment',
        status: 'pendingReview',
        productRecall: { id: 'recall-1', recall_no: 'RC-2026-0001' },
      }),
    };
    const service = new TraceabilityService({} as any, {} as any, linkageService as any);

    const result = await service.createAction(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz' },
      { id: 'user-1', companyId: 'company-1' } as any,
    );

    expect(linkageService.create).toHaveBeenCalledWith(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz' },
      { id: 'user-1', companyId: 'company-1' },
    );
    expect((result as any).productRecall).toEqual({ id: 'recall-1', recall_no: 'RC-2026-0001' });
  });
});
