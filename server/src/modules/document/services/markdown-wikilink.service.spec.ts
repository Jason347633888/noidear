import { MarkdownWikilinkService } from './markdown-wikilink.service';

describe('MarkdownWikilinkService', () => {
  const prisma = {
    document: { findMany: jest.fn() },
    documentReference: { deleteMany: jest.fn(), create: jest.fn() },
  };
  let service: MarkdownWikilinkService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.documentReference.deleteMany.mockResolvedValue({ count: 0 });
    prisma.documentReference.create.mockResolvedValue({ id: 'ref1' });
    service = new MarkdownWikilinkService(prisma as any);
  });

  it('extracts unique trimmed non-empty wikilink labels', () => {
    expect(service.extractWikilinks('引用 [[GRSS-CX-01]]、[[ 原辅料验收标准 ]]、[[]]、[[GRSS-CX-01]]')).toEqual([
      'GRSS-CX-01',
      '原辅料验收标准',
    ]);
  });

  it('creates a document reference when label matches document number or title', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      { id: 'target1', title: '原辅料验收标准', number: 'GRSS-CG-01', doc_code: null },
    ]);

    await service.syncDocumentWikilinks('source1', '见 [[原辅料验收标准]]');

    expect(prisma.documentReference.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceDocId: 'source1',
        targetDocId: 'target1',
        targetType: 'document',
        targetId: 'target1',
        targetLabel: '原辅料验收标准',
        relationType: 'WIKILINK',
        sectionId: 'wikilink:原辅料验收标准',
      }),
    });
  });

  it('creates an unresolved reference when no document matches', async () => {
    prisma.document.findMany.mockResolvedValueOnce([]);

    await service.syncDocumentWikilinks('source1', '见 [[不存在的文件]]');

    expect(prisma.documentReference.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceDocId: 'source1',
        targetDocId: null,
        targetType: 'unresolved_document',
        targetId: null,
        targetLabel: '不存在的文件',
        relationType: 'WIKILINK',
        sectionId: 'wikilink:不存在的文件',
      }),
    });
  });

  it('creates a conflict reference with candidates when one label matches multiple documents', async () => {
    const candidates = [
      { id: 'target1', title: '原辅料验收标准', number: 'GRSS-CG-01', doc_code: null },
      { id: 'target2', title: '原辅料验收标准', number: 'GRSS-CG-02', doc_code: null },
    ];
    prisma.document.findMany.mockResolvedValueOnce(candidates);

    await service.syncDocumentWikilinks('source1', '见 [[原辅料验收标准]]');

    expect(prisma.documentReference.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceDocId: 'source1',
        targetDocId: null,
        targetType: 'conflict_document',
        targetId: null,
        targetLabel: '原辅料验收标准',
        relationType: 'WIKILINK',
        sectionId: 'wikilink:原辅料验收标准',
        snapshot: { candidates },
      }),
    });
  });

  it('deletes existing WIKILINK references for the source document before syncing', async () => {
    prisma.document.findMany.mockResolvedValueOnce([]);

    await service.syncDocumentWikilinks('source1', '见 [[GRSS-CX-01]]');

    expect(prisma.documentReference.deleteMany).toHaveBeenCalledWith({
      where: { sourceDocId: 'source1', relationType: 'WIKILINK' },
    });
    expect(prisma.documentReference.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.documentReference.create.mock.invocationCallOrder[0],
    );
  });
});
