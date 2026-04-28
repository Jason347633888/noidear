import { DocumentControlWorkbenchService } from './document-control-workbench.service';
import { EFFECTIVE_COMPAT_STATUSES } from '../constants/document-control.constants';

describe('DocumentControlWorkbenchService', () => {
  const prisma = {
    document: { findMany: jest.fn(), count: jest.fn() },
    documentReference: { findMany: jest.fn(), count: jest.fn() },
    recordFormLandingEntry: { findMany: jest.fn(), count: jest.fn() },
    documentTrainingNeed: { findMany: jest.fn(), count: jest.fn() },
    documentImpactItem: { findMany: jest.fn(), count: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.document.findMany.mockResolvedValue([]);
    prisma.document.count.mockResolvedValue(0);
    prisma.documentReference.findMany.mockResolvedValue([]);
    prisma.documentReference.count.mockResolvedValue(0);
    prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
    prisma.recordFormLandingEntry.count.mockResolvedValue(0);
    prisma.documentTrainingNeed.findMany.mockResolvedValue([]);
    prisma.documentTrainingNeed.count.mockResolvedValue(0);
    prisma.documentImpactItem.findMany.mockResolvedValue([]);
    prisma.documentImpactItem.count.mockResolvedValue(0);
  });

  it('returns queue counts for all workbench sections', async () => {
    prisma.document.count
      .mockResolvedValueOnce(1)  // pendingReview
      .mockResolvedValueOnce(2)  // dueForReview
      .mockResolvedValueOnce(3)  // expiringExternalFiles
      .mockResolvedValueOnce(4)  // missingMetadata
    prisma.documentReference.count
      .mockResolvedValueOnce(5)  // obsoleteReferences
      .mockResolvedValueOnce(6); // brokenReferences
    prisma.recordFormLandingEntry.count.mockResolvedValueOnce(7);
    prisma.documentTrainingNeed.count.mockResolvedValueOnce(8);
    prisma.documentImpactItem.count.mockResolvedValueOnce(9);

    const service = new DocumentControlWorkbenchService(prisma as any);
    const result = await service.getWorkbench(30);

    expect(result.counts.pendingReview).toBe(1);
    expect(result.counts.dueForReview).toBe(2);
    expect(result.counts.expiringExternalFiles).toBe(3);
    expect(result.counts.missingMetadata).toBe(4);
    expect(result.counts.obsoleteReferences).toBe(5);
    expect(result.counts.brokenReferences).toBe(6);
    expect(result.counts.missingLandingTargets).toBe(7);
    expect(result.counts.trainingNeeds).toBe(8);
    expect(result.counts.openImpactItems).toBe(9);
    expect(prisma.document.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        status: { in: EFFECTIVE_COMPAT_STATUSES },
      }),
    }));
    expect(prisma.document.findMany).toHaveBeenNthCalledWith(3, expect.objectContaining({
      where: expect.objectContaining({
        status: { in: EFFECTIVE_COMPAT_STATUSES },
      }),
    }));
  });

  it('returns zero counts when all queues are empty', async () => {
    const service = new DocumentControlWorkbenchService(prisma as any);
    const result = await service.getWorkbench(30);

    expect(result.counts.pendingReview).toBe(0);
    expect(result.counts.dueForReview).toBe(0);
    expect(result.counts.expiringExternalFiles).toBe(0);
    expect(result.counts.obsoleteReferences).toBe(0);
    expect(result.counts.brokenReferences).toBe(0);
    expect(result.counts.missingLandingTargets).toBe(0);
    expect(result.counts.missingMetadata).toBe(0);
  });

  it('exposes stable issue type contract values', async () => {
    const dto = await import('../dto/document-control.dto');
    expect(dto.WORKBENCH_ISSUE_TYPES).toEqual([
      'pendingReview',
      'dueForReview',
      'expiringExternalFiles',
      'obsoleteReferences',
      'brokenReferences',
      'missingLandingTargets',
      'unconfirmedLandingTargets',
      'partialFieldCoverage',
      'unimplementedRecordReferences',
      'missingMetadata',
      'trainingNeeds',
      'openImpactItems',
    ]);
  });

  it('returns paginated due-for-review issue rows with action routes', async () => {
    prisma.document.count.mockResolvedValueOnce(1);
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-1',
        number: 'QM-001',
        title: '质量手册',
        review_due_date: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ]);

    const service = new DocumentControlWorkbenchService(prisma as any);
    const result = await service.listIssues({ type: 'dueForReview', page: 1, limit: 20, days: 30 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(expect.objectContaining({
      id: 'doc-1',
      issueType: 'dueForReview',
      severity: 'medium',
      title: 'QM-001 质量手册',
      sourceType: 'document',
      sourceId: 'doc-1',
      actionLabel: '查看复审文件',
      actionRoute: '/documents/control/library?issue=dueForReview&documentId=doc-1',
    }));
  });

  it('returns missing landing target issue rows with record form action routes', async () => {
    prisma.recordFormLandingEntry.count.mockResolvedValueOnce(1);
    prisma.recordFormLandingEntry.findMany.mockResolvedValueOnce([
      {
        id: 'landing-1',
        sourceCode: 'GRSS-PZ-JL-01',
        targetRoute: null,
        targetModule: null,
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
      },
    ]);

    const service = new DocumentControlWorkbenchService(prisma as any);
    const result = await service.listIssues({ type: 'missingLandingTargets', page: 1, limit: 20, days: 30 });

    expect(result.items[0]).toEqual(expect.objectContaining({
      id: 'landing-1',
      issueType: 'missingLandingTargets',
      severity: 'high',
      title: 'GRSS-PZ-JL-01 缺少落地入口',
      sourceType: 'record_form_landing',
      sourceId: 'GRSS-PZ-JL-01',
      actionRoute: '/documents/control/record-form-index?issue=missingLandingTargets&code=GRSS-PZ-JL-01',
    }));
  });

  it('lists unconfirmed record form landing targets', async () => {
    prisma.recordFormLandingEntry.count.mockResolvedValue(1);
    prisma.recordFormLandingEntry.findMany.mockResolvedValue([{
      id: 'landing-1',
      sourceCode: 'GRSS-PZ-JL-01',
      confirmationStatus: 'suggested',
      landingStatus: 'dynamic_form',
      updatedAt: new Date('2026-04-28T00:00:00Z'),
    }]);
    const service = new DocumentControlWorkbenchService(prisma as any);

    const result = await service.listIssues({ type: 'unconfirmedLandingTargets', page: 1, limit: 20 });

    expect(result.items[0]).toEqual(expect.objectContaining({
      issueType: 'unconfirmedLandingTargets',
      sourceType: 'record_form_landing',
      actionLabel: '确认落地关系',
    }));
  });

  it('clamps issue pagination to a safe range', async () => {
    prisma.document.count.mockResolvedValueOnce(0);
    prisma.document.findMany.mockResolvedValueOnce([]);

    const service = new DocumentControlWorkbenchService(prisma as any);
    await service.listIssues({ type: 'pendingReview', page: -10, limit: 999, days: 30 });

    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 100,
    }));
  });
});
