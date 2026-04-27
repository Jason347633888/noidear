import { DocumentReferenceHealthService } from './document-reference-health.service';

describe('DocumentReferenceHealthService', () => {
  const prisma = {
    documentReference: { findMany: jest.fn() },
  };
  let service: DocumentReferenceHealthService;

  const baseReference = {
    id: 'ref-1',
    sourceDocId: 'source-1',
    targetDocId: 'target-1',
    targetType: 'document',
    targetLabel: '目标文件',
    relationType: 'WIKILINK',
    sourceDoc: { id: 'source-1', title: '来源文件', number: 'SRC-001' },
    targetDoc: {
      id: 'target-1',
      title: '目标文件',
      number: 'DOC-001',
      status: 'effective',
      deletedAt: null,
      archivedAt: null,
      obsoletedAt: null,
      superseded_by_id: null,
      superseded_by: null,
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new DocumentReferenceHealthService(prisma as any);
  });

  it('returns dangling when target is unresolved', async () => {
    prisma.documentReference.findMany.mockResolvedValueOnce([
      { ...baseReference, targetDocId: null, targetType: 'unresolved_document', targetDoc: null, targetLabel: '不存在文件' },
    ]);

    const result = await service.getDocumentHealth('source-1');

    expect(prisma.documentReference.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        sourceDocId: 'source-1',
        OR: expect.arrayContaining([
          { targetType: { in: ['document', 'unresolved_document', 'conflict_document'] } },
          { targetDocId: { not: null } },
        ]),
      }),
    }));
    expect(result.totals).toMatchObject({ total: 1, dangling: 1, healthy: 0 });
    expect(result.issues[0]).toMatchObject({
      status: 'dangling',
      label: '不存在文件',
      reason: '引用文本未匹配到受控文件。',
    });
  });

  it('returns conflict with candidate files', async () => {
    const candidates = [
      { id: 'doc-1', number: 'CX-01', title: '重复文件' },
      { id: 'doc-2', number: 'CX-02', title: '重复文件' },
    ];
    prisma.documentReference.findMany.mockResolvedValueOnce([
      { ...baseReference, targetDocId: null, targetType: 'conflict_document', targetDoc: null, targetLabel: '重复文件', snapshot: { candidates } },
    ]);

    const result = await service.getDocumentHealth('source-1');

    expect(result.totals).toMatchObject({ total: 1, conflict: 1 });
    expect(result.issues[0]).toMatchObject({
      status: 'conflict',
      candidates,
    });
  });

  it.each([
    ['deleted target', { deletedAt: new Date('2026-01-01') }],
    ['archived target', { archivedAt: new Date('2026-01-01') }],
    ['obsoleted target', { obsoletedAt: new Date('2026-01-01') }],
    ['inactive status', { status: 'inactive' }],
    ['obsolete status', { status: 'obsolete' }],
    ['archived status', { status: 'archived' }],
  ])('returns invalid for %s', async (_caseName, targetPatch) => {
    prisma.documentReference.findMany.mockResolvedValueOnce([
      { ...baseReference, targetDoc: { ...baseReference.targetDoc, ...targetPatch } },
    ]);

    const result = await service.getDocumentHealth('source-1');

    expect(result.totals.invalid).toBe(1);
    expect(result.issues[0]).toMatchObject({
      status: 'invalid',
      targetDocId: 'target-1',
      reason: '目标文件已删除、归档、作废或停用，不能作为当前依据。',
    });
  });

  it('returns superseded when target has a replacement document', async () => {
    prisma.documentReference.findMany.mockResolvedValueOnce([
      {
        ...baseReference,
        targetDoc: {
          ...baseReference.targetDoc,
          superseded_by_id: 'target-2',
          superseded_by: { id: 'target-2', title: '目标文件新版' },
        },
      },
    ]);

    const result = await service.getDocumentHealth('source-1');

    expect(result.totals.superseded).toBe(1);
    expect(result.issues[0]).toMatchObject({
      status: 'superseded',
      targetDocId: 'target-1',
      supersededById: 'target-2',
      supersededByTitle: '目标文件新版',
    });
  });

  it('returns healthy when target document is usable', async () => {
    prisma.documentReference.findMany.mockResolvedValueOnce([baseReference]);

    const result = await service.getDocumentHealth('source-1');

    expect(result.totals).toMatchObject({ total: 1, healthy: 1 });
    expect(result.issues[0]).toMatchObject({
      status: 'healthy',
      targetDocId: 'target-1',
      targetTitle: '目标文件',
    });
  });

  it('global issue list excludes healthy references', async () => {
    prisma.documentReference.findMany.mockResolvedValueOnce([
      baseReference,
      { ...baseReference, id: 'ref-2', targetDocId: null, targetType: 'unresolved_document', targetDoc: null, targetLabel: '缺失文件' },
    ]);

    const result = await service.listIssues();

    expect(result.totals).toMatchObject({ total: 2, healthy: 1, dangling: 1 });
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].status).toBe('dangling');
  });
});
