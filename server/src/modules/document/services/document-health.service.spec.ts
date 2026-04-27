import { DocumentHealthService } from './document-health.service';
import { EFFECTIVE_COMPAT_STATUSES } from '../constants/document-control.constants';

describe('DocumentHealthService', () => {
  it('returns transparent health counts', async () => {
    const prisma = {
      document: { count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3) },
      documentReadRequirement: { count: jest.fn().mockResolvedValue(4) },
      documentTrainingNeed: { count: jest.fn().mockResolvedValue(5) },
      documentImpactItem: { count: jest.fn().mockResolvedValue(6) },
    };
    const service = new DocumentHealthService(prisma as any);
    const result = await service.getHealth(30);
    expect(result).toEqual(expect.objectContaining({
      missingOwnerOrReview: 1,
      overdueReview: 2,
      expiredExternal: 3,
      overdueReadRequirements: 4,
      openTrainingNeeds: 5,
      openImpactItems: 6,
    }));
    expect(prisma.document.count).toHaveBeenNthCalledWith(2, {
      where: expect.objectContaining({
        status: { in: EFFECTIVE_COMPAT_STATUSES },
      }),
    });
  });
});
