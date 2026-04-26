import { DocumentAuditCoverageService } from './document-audit-coverage.service';

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
  });
});
