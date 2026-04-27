import { DocumentControlWorkbenchService } from './document-control-workbench.service';
import { EFFECTIVE_COMPAT_STATUSES } from '../constants/document-control.constants';

describe('DocumentControlWorkbenchService', () => {
  const prisma = {
    document: { findMany: jest.fn() },
    documentReference: { findMany: jest.fn() },
    recordFormLandingEntry: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.document.findMany.mockResolvedValue([]);
    prisma.documentReference.findMany.mockResolvedValue([]);
    prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
  });

  it('returns queue counts for all workbench sections', async () => {
    prisma.document.findMany
      .mockResolvedValueOnce([{ id: 'pending' }])
      .mockResolvedValueOnce([{ id: 'due' }])
      .mockResolvedValueOnce([{ id: 'external' }])
      .mockResolvedValueOnce([{ id: 'missing' }]);
    prisma.documentReference.findMany
      .mockResolvedValueOnce([{ id: 'obsolete-ref' }])
      .mockResolvedValueOnce([{ id: 'broken-ref' }]);
    prisma.recordFormLandingEntry.findMany.mockResolvedValueOnce([{ id: 'landing-gap' }]);

    const service = new DocumentControlWorkbenchService(prisma as any);
    const result = await service.getWorkbench(30);

    expect(result.counts.pendingReview).toBe(1);
    expect(result.counts.dueForReview).toBe(1);
    expect(result.counts.expiringExternalFiles).toBe(1);
    expect(result.counts.obsoleteReferences).toBe(1);
    expect(result.counts.brokenReferences).toBe(1);
    expect(result.counts.missingLandingTargets).toBe(1);
    expect(result.counts.missingMetadata).toBe(1);
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
});
