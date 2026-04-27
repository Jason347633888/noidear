import { DocumentImpactService } from './document-impact.service';

describe('DocumentImpactService', () => {
  it('creates impact items from document references and landing entries', async () => {
    const prisma = {
      documentReference: {
        findMany: jest.fn().mockResolvedValue([
          {
            targetType: 'business_module',
            targetId: 'process',
            targetRoute: '/process',
            targetLabel: '研发流程',
            relationType: 'REQUIRES_RECORD',
          },
        ]),
      },
      recordFormLandingEntry: {
        findMany: jest.fn().mockResolvedValue([
          { sourceCode: 'GRSS-KF-JL-01', targetRoute: '/process' },
        ]),
      },
      documentImpactReview: {
        create: jest.fn().mockResolvedValue({ id: 'review1', items: [{ id: 'item1' }, { id: 'item2' }] }),
      },
      documentImpactItem: { findUnique: jest.fn(), update: jest.fn() },
    };
    const service = new DocumentImpactService(prisma as any);
    const result = await service.createReview({ sourceType: 'document', sourceId: 'doc1', title: 'CX-11影响评估' });
    expect(result.items).toHaveLength(2);
    expect(prisma.documentImpactReview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceType: 'document',
        sourceId: 'doc1',
        items: expect.objectContaining({ create: expect.any(Array) }),
      }),
    }));
  });

  it('links impact review to change event when provided', async () => {
    const prisma = {
      documentReference: { findMany: jest.fn().mockResolvedValue([]) },
      recordFormLandingEntry: { findMany: jest.fn().mockResolvedValue([]) },
      documentImpactReview: { create: jest.fn().mockResolvedValue({ id: 'review1', changeEventId: 'change1', items: [] }) },
      documentImpactItem: { findUnique: jest.fn(), update: jest.fn() },
    };
    const service = new DocumentImpactService(prisma as any);

    await service.createReview({
      sourceType: 'change_event',
      sourceId: 'change1',
      changeEventId: 'change1',
      title: '变更影响评审',
    } as any);

    expect(prisma.documentImpactReview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceType: 'change_event',
        sourceId: 'change1',
        changeEventId: 'change1',
      }),
    }));
  });
});
