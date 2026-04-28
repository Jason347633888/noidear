import { MarkdownWikilinkService } from './markdown-wikilink.service';

describe('MarkdownWikilinkService', () => {
  const prisma = {
    document: { findMany: jest.fn(), findUnique: jest.fn() },
    documentReference: { deleteMany: jest.fn(), create: jest.fn() },
    recordFormLandingEntry: { findMany: jest.fn() },
  };
  let service: MarkdownWikilinkService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.document.findUnique.mockResolvedValue({ id: 'source1', title: '当前文件', number: 'DOC-001', doc_code: null });
    prisma.documentReference.deleteMany.mockResolvedValue({ count: 0 });
    prisma.documentReference.create.mockResolvedValue({ id: 'ref1' });
    prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
    service = new MarkdownWikilinkService(prisma as any);
  });

  it('extracts unique trimmed wikilink targets without alias display labels', () => {
    expect(service.extractWikilinks('引用 [[GRSS-CX-01|文件控制程序]]、[[ 原辅料验收标准 ]]、[[]]、[[GRSS-CX-01|重复显示]]')).toEqual([
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
        wikilinkTarget: '原辅料验收标准',
      }),
    });
    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { not: 'source1' },
      }),
    }));
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
        wikilinkTarget: '不存在的文件',
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
        wikilinkTarget: '原辅料验收标准',
      }),
    });
  });

  it('deletes existing WIKILINK references for the source document before syncing', async () => {
    prisma.document.findMany.mockResolvedValueOnce([]);

    await service.syncDocumentWikilinks('source1', '见 [[GRSS-CX-02]]');

    expect(prisma.documentReference.deleteMany).toHaveBeenCalledWith({
      where: { sourceDocId: 'source1', relationType: 'WIKILINK' },
    });
    expect(prisma.documentReference.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.documentReference.create.mock.invocationCallOrder[0],
    );
  });

  it('stores the alias target as wikilinkTarget and not the display label', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      { id: 'target1', title: '文件控制程序', number: 'GRSS-CX-01', doc_code: null },
    ]);

    await service.syncDocumentWikilinks('source1', '见 [[GRSS-CX-01|文件控制程序]]');

    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { number: 'GRSS-CX-01' },
          { title: 'GRSS-CX-01' },
          { doc_code: 'GRSS-CX-01' },
        ],
      }),
    }));
    expect(prisma.documentReference.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetDocId: 'target1',
        targetLabel: '文件控制程序',
        sectionId: 'wikilink:GRSS-CX-01',
        wikilinkTarget: 'GRSS-CX-01',
      }),
    });
  });

  it('resolves source form wikilinks to record form landing entries', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc-1', title: '程序文件', number: 'QP-001' });
    prisma.document.findMany.mockResolvedValue([]);
    prisma.recordFormLandingEntry.findMany.mockResolvedValue([{
      id: 'landing-1',
      sourceCode: 'GRSS-ZZ-JL-43',
      landingStatus: 'dynamic_form',
      targetRoute: '/records/fill/tpl-1',
    }]);

    await service.syncDocumentWikilinks('doc-1', '生产过程应填写 [[GRSS-ZZ-JL-43 玻璃及硬塑制品检查表]]');

    expect(prisma.documentReference.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        targetType: 'record_form_landing',
        targetId: 'GRSS-ZZ-JL-43',
        targetRoute: '/records/fill/tpl-1',
      }),
    }));
  });

  it('skips self-references when wikilink matches the source document', async () => {
    prisma.document.findMany.mockResolvedValueOnce([{ id: 'target1', title: '其他文件', number: 'DOC-002', doc_code: null }]);

    await service.syncDocumentWikilinks('source1', '见 [[DOC-001]] 和 [[其他文件]]');

    expect(prisma.document.findUnique).toHaveBeenCalledWith({
      where: { id: 'source1' },
      select: { id: true, title: true, number: true, doc_code: true },
    });
    expect(prisma.document.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { not: 'source1' } }),
    }));
    expect(prisma.documentReference.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceDocId: 'source1',
        targetDocId: 'target1',
        targetType: 'document',
        targetId: 'target1',
        targetLabel: '其他文件',
        relationType: 'WIKILINK',
      }),
    });
  });
});
