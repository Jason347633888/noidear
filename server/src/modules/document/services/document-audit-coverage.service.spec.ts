import { DocumentAuditCoverageService } from './document-audit-coverage.service';
import { EFFECTIVE_COMPAT_STATUSES } from '../constants/document-control.constants';

describe('DocumentAuditCoverageService', () => {
  it('marks effective procedure without review as coverage gap', async () => {
    const prisma = {
      document: {
        findMany: jest.fn().mockResolvedValue([{ id: 'doc1', title: 'CX-11', document_type: 'PROCEDURE' }]),
      },
      documentCoverageReview: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new DocumentAuditCoverageService(prisma as any);
    const result = await service.getCoverage(new Date('2026-01-01'), new Date('2026-12-31'));
    expect(result).toHaveLength(1);
    expect(result[0].coverageStatus).toBe('gap');
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: { in: EFFECTIVE_COMPAT_STATUSES },
      }),
    });
  });
});
