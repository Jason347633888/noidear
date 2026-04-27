import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { DocumentService } from './document.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { NotificationService } from '../notification/notification.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';
import { FilePreviewService } from './services';
import { EFFECTIVE_COMPAT_STATUSES } from './constants/document-control.constants';

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
      ],
    }).compile();
    service = module.get(DocumentService);
  });

  it('saves the current file before rollback and writes rollback audit details', async () => {
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc1',
      version: new Prisma.Decimal('1.2'),
      filePath: 'documents/current.pdf',
      fileName: 'current.pdf',
      fileSize: 200,
      status: 'effective',
      deletedAt: null,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({
      version: new Prisma.Decimal('1.0'),
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
        version: new Prisma.Decimal('1.2'),
        filePath: 'documents/current.pdf',
        fileName: 'current.pdf',
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
      version: new Prisma.Decimal('1.2'),
      filePath: 'documents/current.pdf',
      fileName: 'current.pdf',
      fileSize: 200,
      status: 'effective',
      deletedAt: null,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({
      version: new Prisma.Decimal('1.0'),
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
      version: new Prisma.Decimal('1.0'),
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
      version: new Prisma.Decimal('1.0'),
      filePath: 'documents/old.pdf',
      fileName: '旧版本.pdf',
      fileSize: 123,
    });
    filePreview.assertFileAccess.mockResolvedValue(undefined);
    storage.getFileStream.mockResolvedValue(stream);

    await service.downloadVersion('doc1', '1.0', 'u1', 'user', res as any);

    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="___.pdf"; filename*=UTF-8''${encodeURIComponent('旧版本.pdf')}`,
      'Content-Length': '123',
    });
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });
});
