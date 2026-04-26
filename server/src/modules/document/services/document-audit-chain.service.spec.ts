import { DocumentAuditChainService } from './document-audit-chain.service';

describe('DocumentAuditChainService', () => {
  it('creates nodes and edges from document references', async () => {
    const prisma = {
      document: {
        findMany: jest.fn().mockResolvedValueOnce([{ id: 'doc1', title: 'CX-11' }]),
      },
      documentReference: {
        findMany: jest.fn().mockResolvedValueOnce([
          {
            sourceDocId: 'doc1',
            targetType: 'business_module',
            targetId: 'traceability',
            targetRoute: '/traceability',
            targetLabel: '追溯查询',
            relationType: 'EVIDENCE_FOR',
          },
        ]),
      },
    };
    const service = new DocumentAuditChainService(prisma as any);
    const result = await service.getChain('document', 'doc1', 4);
    expect(result.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'document', id: 'doc1' }),
      expect.objectContaining({ type: 'business_module', label: '追溯查询' }),
    ]));
    expect(result.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'doc1', relationType: 'EVIDENCE_FOR' }),
    ]));
  });

  it('clamps maxDepth to 8', async () => {
    const prisma = {
      document: { findMany: jest.fn().mockResolvedValue([]) },
      documentReference: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new DocumentAuditChainService(prisma as any);
    // Should not throw even with large maxDepth
    const result = await service.getChain('document', 'doc1', 100);
    expect(result.nodes).toEqual([]);
  });

  it('returns empty for non-document sourceType', async () => {
    const prisma = {
      document: { findMany: jest.fn() },
      documentReference: { findMany: jest.fn() },
    };
    const service = new DocumentAuditChainService(prisma as any);
    const result = await service.getChain('record', 'rec1', 4);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
