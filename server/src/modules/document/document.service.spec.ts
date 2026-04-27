import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentService } from './document.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { NotificationService } from '../notification/notification.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';
import { ErrorCode } from '../../common/exceptions/business.exception';

describe('DocumentService document control metadata', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    document: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    department: { findUnique: jest.fn() },
    pendingNumber: { findFirst: jest.fn() },
    numberRule: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const storage = { uploadFile: jest.fn() };
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
        { provide: NotificationService, useValue: { create: jest.fn() } },
        { provide: OperationLogService, useValue: operationLog },
        { provide: EventEmitter2, useValue: eventEmitter },
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

      const result = await service.updateMarkdown('doc1', 'u1', 'admin', { contentMd: '# 新内容' });

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc1', deletedAt: null },
      });
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc1' },
        data: { content_md: '# 新内容' },
      });
      expect(result).toEqual({ id: 'doc1', content_md: '# 新内容' });
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
        code: ErrorCode.CONFLICT,
        message: '仅草稿或驳回文档可直接编辑正文',
      });
      expect(prisma.document.update).not.toHaveBeenCalled();
    });
  });
});
