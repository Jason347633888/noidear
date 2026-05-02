import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@prisma/client/runtime/library';
import { DocumentService } from './document.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { NotificationService } from '../notification/notification.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';
import { FilePreviewService } from './services';
import { EFFECTIVE_COMPAT_STATUSES } from './constants/document-control.constants';
import { MarkdownWikilinkService } from './services/markdown-wikilink.service';
import { NumberRuleService } from './services/number-rule.service';
import { ErrorCode } from '../../common/exceptions/business.exception';

describe('DocumentService document control metadata', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    document: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    approval: { findFirst: jest.fn(), update: jest.fn() },
    department: { findUnique: jest.fn() },
    pendingNumber: { findFirst: jest.fn() },
    numberRule: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const storage = { uploadFile: jest.fn() };
  const filePreview = { assertFileAccess: jest.fn() };
  const markdownWikilinkService = { syncDocumentWikilinks: jest.fn() };
  const notification = { create: jest.fn() };
  const operationLog = { log: jest.fn() };
  const eventEmitter = { emit: jest.fn() };

  let service: DocumentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    const module = await Test.createTestingModule({
      providers: [
        DocumentService,
        DocumentControlMetadataService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: NotificationService, useValue: notification },
        { provide: OperationLogService, useValue: operationLog },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: FilePreviewService, useValue: filePreview },
        { provide: MarkdownWikilinkService, useValue: markdownWikilinkService },
        { provide: NumberRuleService, useValue: { generate: jest.fn().mockResolvedValue('2-PZ-001') } },
      ],
    }).compile();
    service = module.get(DocumentService);
  });

  it('persists document control metadata on create', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', departmentId: 'd1' });
    prisma.document.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb) => cb({
      pendingNumber: { findFirst: jest.fn().mockResolvedValue(null), delete: jest.fn() },
      department: { findUnique: jest.fn().mockResolvedValue({ id: 'd1', code: 'PZ' }) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      numberRule: {
        create: jest.fn().mockResolvedValue({ id: 'rule1', sequence: 0 }),
        update: jest.fn(),
      },
    }));
    storage.uploadFile.mockResolvedValue({ path: 'documents/level2/file.pdf' });
    prisma.document.create.mockResolvedValue({ id: 'doc1', title: 'CX-11' });

    await service.create({
      level: 2,
      title: 'CX-11',
      control: {
        documentType: 'PROCEDURE',
        sourceFolder: '02',
        metadata: { processArea: 'traceability' },
      },
    } as any, { originalname: 'cx11.pdf', size: 100, mimetype: 'application/pdf' } as any, 'u1');

    expect(prisma.document.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        document_type: 'PROCEDURE',
        source_folder: '02',
        metadata: { processArea: 'traceability' },
        departmentId: 'd1',
      }),
    }));
  });

  describe('updateMarkdown', () => {
    it('updates markdown content for an admin', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', creatorId: 'creator1', status: 'draft' });
      prisma.document.update.mockResolvedValue({ id: 'doc1', content_md: '# 新内容' });
      markdownWikilinkService.syncDocumentWikilinks.mockResolvedValue(undefined);

      const result = await service.updateMarkdown('doc1', 'u1', 'admin', { contentMd: '# 新内容' });

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc1', deletedAt: null },
      });
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc1' },
        data: { content_md: '# 新内容' },
      });
      expect(markdownWikilinkService.syncDocumentWikilinks).toHaveBeenCalledWith('doc1', '# 新内容', prisma);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
      expect(prisma.document.update.mock.invocationCallOrder[0]).toBeLessThan(
        markdownWikilinkService.syncDocumentWikilinks.mock.invocationCallOrder[0],
      );
      expect(markdownWikilinkService.syncDocumentWikilinks.mock.invocationCallOrder[0]).toBeLessThan(
        eventEmitter.emit.mock.invocationCallOrder[0],
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('document.updated', { documentId: 'doc1' });
      expect(result).toEqual({ id: 'doc1', content_md: '# 新内容' });
    });

    it('updates markdown content for the document creator', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', creatorId: 'u1', status: 'rejected' });
      prisma.document.update.mockResolvedValue({ id: 'doc1', content_md: '# 创建者更新' });
      markdownWikilinkService.syncDocumentWikilinks.mockResolvedValue(undefined);

      const result = await service.updateMarkdown('doc1', 'u1', 'user', { contentMd: '# 创建者更新' });

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc1' },
        data: { content_md: '# 创建者更新' },
      });
      expect(markdownWikilinkService.syncDocumentWikilinks).toHaveBeenCalledWith('doc1', '# 创建者更新', prisma);
      expect(eventEmitter.emit).toHaveBeenCalledWith('document.updated', { documentId: 'doc1' });
      expect(result).toEqual({ id: 'doc1', content_md: '# 创建者更新' });
    });

    it('does not emit document update when wikilink sync fails', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', creatorId: 'creator1', status: 'draft' });
      prisma.document.update.mockResolvedValue({ id: 'doc1', content_md: '# 新内容' });
      markdownWikilinkService.syncDocumentWikilinks.mockRejectedValue(new Error('sync failed'));

      await expect(
        service.updateMarkdown('doc1', 'u1', 'admin', { contentMd: '# 新内容' }),
      ).rejects.toThrow('sync failed');

      expect(eventEmitter.emit).not.toHaveBeenCalledWith('document.updated', { documentId: 'doc1' });
    });

    it('rejects missing markdown content', async () => {
      await expect(
        service.updateMarkdown('doc1', 'u1', 'admin', {} as any),
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'contentMd 必须是字符串',
      });
      expect(prisma.document.findUnique).not.toHaveBeenCalled();
      expect(prisma.document.update).not.toHaveBeenCalled();
    });

    it('rejects non-string markdown content', async () => {
      await expect(
        service.updateMarkdown('doc1', 'u1', 'admin', { contentMd: 123 } as any),
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'contentMd 必须是字符串',
      });
      expect(prisma.document.findUnique).not.toHaveBeenCalled();
      expect(prisma.document.update).not.toHaveBeenCalled();
    });

    it('throws not found when document is missing', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMarkdown('missing', 'u1', 'admin', { contentMd: '# 新内容' }),
      ).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
        message: '文档不存在',
      });
      expect(prisma.document.update).not.toHaveBeenCalled();
    });

    it('forbids non-admin users from editing another creator document', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', creatorId: 'creator1', status: 'draft' });

      const update = service.updateMarkdown('doc1', 'u1', 'user', { contentMd: '# 新内容' });

      await expect(update).rejects.toMatchObject({
        code: ErrorCode.FORBIDDEN,
        message: '无权编辑该文档',
      });
      expect(prisma.document.update).not.toHaveBeenCalled();
    });

    it('rejects direct markdown edits for approved documents', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1', creatorId: 'u1', status: 'approved' });

      await expect(
        service.updateMarkdown('doc1', 'u1', 'user', { contentMd: '# 新内容' }),
      ).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
        message: '已发布文件不能原地编辑，请先发起修订',
      });
      expect(prisma.document.update).not.toHaveBeenCalled();
    });
  });
});

describe('document status compatibility', () => {
  const prisma = {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    document: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    approval: { findFirst: jest.fn(), update: jest.fn() },
    department: { findUnique: jest.fn() },
    pendingNumber: { findFirst: jest.fn() },
    numberRule: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const storage = { uploadFile: jest.fn() };
  const filePreview = { assertFileAccess: jest.fn() };
  const markdownWikilinkService = { syncDocumentWikilinks: jest.fn() };
  const notification = { create: jest.fn() };
  const operationLog = { log: jest.fn() };
  const eventEmitter = { emit: jest.fn() };

  let service: DocumentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentService,
        DocumentControlMetadataService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: NotificationService, useValue: notification },
        { provide: OperationLogService, useValue: operationLog },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: FilePreviewService, useValue: filePreview },
        { provide: MarkdownWikilinkService, useValue: markdownWikilinkService },
        { provide: NumberRuleService, useValue: { generate: jest.fn().mockResolvedValue('2-PZ-001') } },
      ],
    }).compile();
    service = module.get(DocumentService);
  });

  it('allows approved documents wherever effective documents are allowed', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      number: 'DOC-001',
      title: 'SOP',
      status: 'approved',
      creatorId: 'u1',
      deletedAt: null,
    });
    prisma.document.update.mockResolvedValue({ id: 'doc1', status: 'archived' });
    notification.create.mockResolvedValue({});
    operationLog.log.mockResolvedValue({});

    await service.archive('doc1', '归档原因满足十个字符', 'u1', 'admin');

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: expect.objectContaining({ status: 'archived' }),
    });
  });

  it('writes effective when approving a document', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      number: 'DOC-001',
      title: 'SOP',
      status: 'pending',
      creatorId: 'creator1',
      deletedAt: null,
    });
    prisma.approval.findFirst.mockResolvedValue({ id: 'ap1', approverId: 'admin1', status: 'pending' });
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'admin1', role: 'admin' })
      .mockResolvedValueOnce({ id: 'creator1', role: 'user' });
    prisma.approval.update.mockResolvedValue({ id: 'ap1', status: 'approved' });
    prisma.document.update.mockResolvedValue({ id: 'doc1', status: 'effective' });
    notification.create.mockResolvedValue({});
    operationLog.log.mockResolvedValue({});

    await service.approve('doc1', 'approved', undefined, 'admin1');

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: expect.objectContaining({ status: 'effective' }),
    });
  });

  it.each(['approved', 'effective'])('treats %s list filter as effective-compatible', async (status) => {
    prisma.document.findMany.mockResolvedValue([{ id: 'doc1', creatorId: null, approverId: null }]);
    prisma.document.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([]);

    await service.findAll({ status } as any, 'admin1', 'admin');

    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { in: EFFECTIVE_COMPAT_STATUSES },
      }),
    }));
    expect(prisma.document.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: { in: EFFECTIVE_COMPAT_STATUSES },
      }),
    });
  });

  it('adds versionLabel to document list responses', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'doc1', creatorId: null, approverId: null, versionNo: 2, version: new Decimal('2.0') }]);
    prisma.document.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await service.findAll({} as any, 'admin1', 'admin');

    expect(result.list[0]).toEqual(expect.objectContaining({
      versionNo: 2,
      versionLabel: 'V2',
      version: '2',
    }));
  });

  it('adds versionLabel to document detail responses', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      number: 'DOC-001',
      creatorId: 'admin1',
      deletedAt: null,
      versionNo: 3,
      version: new Decimal('3.0'),
      sourceReferences: [],
      targetReferences: [],
    });

    const result = await service.findOne('doc1', 'admin1', 'admin');

    expect(result).toEqual(expect.objectContaining({
      versionNo: 3,
      versionLabel: 'V3',
      version: '3',
    }));
  });

  it('filters missing metadata documents when requested', async () => {
    prisma.document.findMany.mockResolvedValue([{ id: 'doc1', creatorId: null, approverId: null }]);
    prisma.document.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([]);

    await service.findAll({ issue: 'missingMetadata' } as any, 'admin1', 'admin');

    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { document_type: null },
          { source_folder: null },
          { review_due_date: null },
        ],
      }),
    }));
  });
});

describe('document version operations', () => {
  const prisma = {
    document: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    documentVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const storage = { uploadFile: jest.fn(), getSignedUrl: jest.fn(), getFileStream: jest.fn() };
  const filePreview = { assertFileAccess: jest.fn() };
  const markdownWikilinkService = { syncDocumentWikilinks: jest.fn() };
  const notification = { create: jest.fn() };
  const operationLog = { log: jest.fn() };
  const eventEmitter = { emit: jest.fn() };

  let service: DocumentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentService,
        DocumentControlMetadataService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: NotificationService, useValue: notification },
        { provide: OperationLogService, useValue: operationLog },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: FilePreviewService, useValue: filePreview },
        { provide: MarkdownWikilinkService, useValue: markdownWikilinkService },
        { provide: NumberRuleService, useValue: { generate: jest.fn().mockResolvedValue('2-PZ-001') } },
      ],
    }).compile();
    service = module.get(DocumentService);
  });

  it('saves the current file before rollback and writes rollback audit details', async () => {
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      version: new Decimal('1.2'),
      filePath: 'documents/current.docx',
      fileName: 'current.docx',
      fileSize: 200,
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      status: 'effective',
      deletedAt: null,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({
      version: new Decimal('1.0'),
      filePath: 'documents/old.pdf',
      fileName: 'old.pdf',
      fileSize: 100,
    });
    prisma.documentVersion.create.mockResolvedValue({});
    prisma.document.updateMany.mockResolvedValue({ count: 1 });
    operationLog.log.mockResolvedValue({});

    await service.rollbackVersion('doc1', '1.0', '恢复到已批准版本', 'u1');

    expect(prisma.documentVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc1',
        version: new Decimal('1.2'),
        filePath: 'documents/current.docx',
        fileName: 'current.docx',
      }),
    });
    expect(prisma.document.updateMany).toHaveBeenCalledWith({
      where: { id: 'doc1', version: new Decimal('1.2') },
      data: expect.objectContaining({
        filePath: 'documents/old.pdf',
        fileName: 'old.pdf',
        fileSize: 100,
        fileType: 'application/pdf',
      }),
    });
    expect(operationLog.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'rollback_version',
      details: expect.objectContaining({
        fromVersion: '1.2',
        targetVersion: '1.0',
        reason: '恢复到已批准版本',
      }),
    }));
  });

  it('rejects rollback when the document version changed concurrently', async () => {
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      version: new Decimal('1.2'),
      filePath: 'documents/current.pdf',
      fileName: 'current.pdf',
      fileSize: 200,
      status: 'effective',
      deletedAt: null,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({
      version: new Decimal('1.0'),
      filePath: 'documents/old.pdf',
      fileName: 'old.pdf',
      fileSize: 100,
    });
    prisma.documentVersion.create.mockResolvedValue({});
    prisma.document.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.rollbackVersion('doc1', '1.0', '恢复到已批准版本', 'u1')).rejects.toThrow();
    expect(operationLog.log).not.toHaveBeenCalled();
  });

  it('rejects rollback when the reason is blank', async () => {
    await expect(service.rollbackVersion('doc1', '1.0', '   ', 'u1')).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects rollback for archived documents', async () => {
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      status: 'archived',
      deletedAt: null,
    });

    await expect(service.rollbackVersion('doc1', '1.0', '恢复到已批准版本', 'u1')).rejects.toThrow();
  });

  it('uses file preview permissions for historical pdf preview', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      status: 'effective',
      creatorId: 'other',
      deletedAt: null,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({
      version: new Decimal('1.0'),
      filePath: 'documents/old.pdf',
      fileName: 'old.pdf',
      fileSize: 100,
    });
    filePreview.assertFileAccess.mockResolvedValue(undefined);
    storage.getSignedUrl.mockResolvedValue('https://signed/old.pdf');

    await expect(service.getVersionPreview('doc1', '1.0', 'u1', 'user')).resolves.toEqual({
      type: 'pdf',
      url: 'https://signed/old.pdf',
      fileName: 'old.pdf',
    });
    expect(filePreview.assertFileAccess).toHaveBeenCalledWith(expect.objectContaining({
      id: 'doc1',
      status: 'effective',
    }), 'u1', 'user');
  });

  it('rejects invalid historical version params', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      status: 'effective',
      creatorId: 'other',
      deletedAt: null,
    });
    filePreview.assertFileAccess.mockResolvedValue(undefined);

    await expect(service.getVersionPreview('doc1', 'not-a-version', 'u1', 'user')).rejects.toThrow();
    expect(prisma.documentVersion.findFirst).not.toHaveBeenCalled();
  });

  it('sets RFC-friendly headers when downloading a historical version', async () => {
    const stream = { pipe: jest.fn() };
    const res = { set: jest.fn() };
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      status: 'effective',
      creatorId: 'other',
      deletedAt: null,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({
      version: new Decimal('1.0'),
      filePath: 'documents/old.pdf',
      fileName: '旧版本.pdf',
      fileSize: 123,
    });
    filePreview.assertFileAccess.mockResolvedValue(undefined);
    storage.getFileStream.mockResolvedValue(stream);

    await service.downloadVersion('doc1', '1.0', 'u1', 'user', res as any);

    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="___.pdf"; filename*=UTF-8''${encodeURIComponent('旧版本.pdf')}`,
      'Content-Length': '123',
    });
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });
});

describe('document revision draft', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    document: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    approval: { findFirst: jest.fn(), update: jest.fn() },
    department: { findUnique: jest.fn() },
    pendingNumber: { findFirst: jest.fn() },
    numberRule: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const storage = { uploadFile: jest.fn() };
  const filePreview = { assertFileAccess: jest.fn() };
  const markdownWikilinkService = { syncDocumentWikilinks: jest.fn() };
  const notification = { create: jest.fn() };
  const operationLog = { log: jest.fn() };
  const eventEmitter = { emit: jest.fn() };

  let service: DocumentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    const module = await Test.createTestingModule({
      providers: [
        DocumentService,
        DocumentControlMetadataService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: NotificationService, useValue: notification },
        { provide: OperationLogService, useValue: operationLog },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: FilePreviewService, useValue: filePreview },
        { provide: MarkdownWikilinkService, useValue: markdownWikilinkService },
        { provide: NumberRuleService, useValue: { generate: jest.fn().mockResolvedValue('2-PZ-001') } },
      ],
    }).compile();
    service = module.get(DocumentService);
  });

  it('creates a revision draft instead of editing an effective document in place', async () => {
    const currentDoc = {
      id: 'doc-v1',
      number: 'GRSS-PZ-ZD-08',
      title: '原物料及产品放行制度',
      level: 3,
      versionNo: 1,
      version: '1.0',
      status: 'effective',
      filePath: 'documents/v1.md',
      fileName: '原物料及产品放行制度.md',
      fileSize: 4900,
      fileType: 'text/markdown',
      creatorId: 'user-1',
      departmentId: 'dept-pz',
      document_type: 'WORK_INSTRUCTION',
      source_folder: '03',
      lineage_key: 'GRSS-PZ-ZD-08',
    };
    prisma.document.findFirst
      .mockResolvedValueOnce(currentDoc)  // findFirst for current doc
      .mockResolvedValueOnce(null)        // findFirst for existingDraft check
      .mockResolvedValueOnce(currentDoc); // findFirst for latest version
    prisma.document.create.mockResolvedValue({ id: 'doc-v2', versionNo: 2, status: 'draft', revisionOfId: 'doc-v1' });

    const result = await service.createRevisionDraft('doc-v1', 'user-2');

    expect(prisma.document.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        number: 'GRSS-PZ-ZD-08',
        versionNo: 2,
        status: 'draft',
        revisionOfId: 'doc-v1',
        revisionStatus: 'revision_draft',
      }),
    }));
    expect(result.id).toBe('doc-v2');
    expect(result.versionLabel).toBe('V2');
  });
});

describe('document owner strong references', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    document: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    approval: { findFirst: jest.fn(), update: jest.fn() },
    department: { findUnique: jest.fn() },
    pendingNumber: { findFirst: jest.fn() },
    numberRule: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const storage = { uploadFile: jest.fn() };
  const filePreview = { assertFileAccess: jest.fn() };
  const markdownWikilinkService = { syncDocumentWikilinks: jest.fn() };
  const notification = { create: jest.fn() };
  const operationLog = { log: jest.fn() };
  const eventEmitter = { emit: jest.fn() };

  let service: DocumentService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentService,
        DocumentControlMetadataService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: NotificationService, useValue: notification },
        { provide: OperationLogService, useValue: operationLog },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: FilePreviewService, useValue: filePreview },
        { provide: MarkdownWikilinkService, useValue: markdownWikilinkService },
        { provide: NumberRuleService, useValue: { generate: jest.fn().mockResolvedValue('2-PZ-001') } },
      ],
    }).compile();
    service = module.get(DocumentService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  });

  it('rejects a missing ownerDepartmentId during document create', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', departmentId: 'dep1' });
    prisma.department.findUnique.mockResolvedValue(null);

    await expect(service.create({
      level: 2,
      title: 'SOP',
      control: { ownerDepartmentId: 'missing-dep' },
    } as any, { originalname: 'sop.pdf', size: 10, mimetype: 'application/pdf' } as any, 'u1'))
      .rejects.toThrow('负责部门不存在');
  });

  it('writes ownerDepartmentId and ownerUserId when both targets exist', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', departmentId: 'dep1' })
      .mockResolvedValueOnce({ id: 'owner1', deletedAt: null });
    prisma.department.findUnique.mockResolvedValue({ id: 'dep-owner', deletedAt: null });
    prisma.document.findFirst.mockResolvedValue(null);
    prisma.pendingNumber.findFirst.mockResolvedValue(null);
    prisma.$queryRaw.mockResolvedValue([{ id: 'rule1', sequence: 1 }]);
    prisma.numberRule.update.mockResolvedValue({});
    storage.uploadFile.mockResolvedValue({ path: 'documents/sop.pdf' });
    prisma.document.create.mockResolvedValue({ id: 'doc1', ownerDepartmentId: 'dep-owner', ownerUserId: 'owner1' });
    operationLog.log.mockResolvedValue({});

    await service.create({
      level: 2,
      title: 'SOP',
      control: { ownerDepartmentId: 'dep-owner', ownerUserId: 'owner1', ownerDepartment: '品质部' },
    } as any, { originalname: 'sop.pdf', size: 10, mimetype: 'application/pdf' } as any, 'u1');

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerDepartmentId: 'dep-owner',
        ownerUserId: 'owner1',
        owner_department: '品质部',
      }),
    });
  });

  it('rejects a missing ownerUserId during document create', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', departmentId: 'dep1' })  // creator lookup
      .mockResolvedValueOnce(null);                                 // ownerUserId lookup
    prisma.department.findUnique.mockResolvedValue({ id: 'dep-owner', deletedAt: null });

    await expect(service.create({
      level: 2,
      title: 'SOP',
      control: { ownerDepartmentId: 'dep-owner', ownerUserId: 'missing-user' },
    } as any, { originalname: 'sop.pdf', size: 10, mimetype: 'application/pdf' } as any, 'u1'))
      .rejects.toThrow('负责人不存在');
  });

  it('rejects a missing ownerDepartmentId during document update', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1', creatorId: 'u1', status: 'draft', level: 2,
      version: 1, filePath: '/f', fileName: 'f.pdf', fileSize: 100, fileType: 'application/pdf',
      deletedAt: null,
    });
    prisma.department.findUnique.mockResolvedValue(null);

    await expect(service.update('doc1', {
      control: { ownerDepartmentId: 'bad-dep' },
    } as any, undefined, 'u1'))
      .rejects.toThrow('负责部门不存在');
  });
});
