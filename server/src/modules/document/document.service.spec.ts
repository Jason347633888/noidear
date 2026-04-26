import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentService } from './document.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { NotificationService } from '../notification/notification.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';

describe('DocumentService document control metadata', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    document: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
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
});
