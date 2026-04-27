import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from '../src/modules/document/document.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/common/services';
import { NotificationService } from '../src/modules/notification/notification.service';
import { OperationLogService } from '../src/modules/operation-log/operation-log.service';
import { DocumentControlMetadataService } from '../src/modules/document/services/document-control-metadata.service';
import { FilePreviewService } from '../src/modules/document/services';
import { BusinessException, ErrorCode } from '../src/common/exceptions/business.exception';
import { Decimal } from '@prisma/client/runtime/library';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('DocumentService - Version Management', () => {
  let service: DocumentService;
  let prismaService: PrismaService;

  const mockPrismaService: any = {
    document: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    documentVersion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  mockPrismaService.$transaction = jest.fn((callback: any) => callback(mockPrismaService));

  const mockStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  };

  const mockNotificationService = {
    create: jest.fn(),
    createMany: jest.fn(),
  };

  const mockOperationLogService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: OperationLogService, useValue: mockOperationLogService },
        { provide: DocumentControlMetadataService, useValue: { normalize: jest.fn((value) => value ?? {}) } },
        { provide: FilePreviewService, useValue: { assertFileAccess: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn(), emitAsync: jest.fn(), on: jest.fn() } },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('compareVersions', () => {
    const documentId = 'doc-123';
    const userId = 'user-456';

    it('should throw error if document does not exist', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(null);

      await expect(
        service.compareVersions(documentId, '1.0', '1.1', userId)
      ).rejects.toThrow(
        new BusinessException(ErrorCode.NOT_FOUND, '文档不存在或已被删除')
      );
    });

    it('should throw error if version 1 does not exist', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue({
        id: documentId,
        deletedAt: null,
      });
      mockPrismaService.documentVersion.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.compareVersions(documentId, '1.0', '1.1', userId)
      ).rejects.toThrow(
        new BusinessException(ErrorCode.NOT_FOUND, '版本 1.0 不存在')
      );
    });

    it('should throw error if version 2 does not exist', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue({
        id: documentId,
        deletedAt: null,
      });
      mockPrismaService.documentVersion.findFirst
        .mockResolvedValueOnce({
          id: 'v1',
          version: new Decimal('1.0'),
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.compareVersions(documentId, '1.0', '1.1', userId)
      ).rejects.toThrow(
        new BusinessException(ErrorCode.NOT_FOUND, '版本 1.1 不存在')
      );
    });

    it('should return version comparison with differences', async () => {
      const version1 = {
        id: 'v1',
        version: new Decimal('1.0'),
        filePath: '/path/v1.pdf',
        fileName: 'doc_v1.pdf',
        fileSize: 1024,
        creatorId: 'user-1',
        creator: { id: 'user-1', username: 'user1', name: 'User 1' },
        createdAt: new Date('2026-01-01T10:00:00Z'),
      };

      const version2 = {
        id: 'v2',
        version: new Decimal('1.1'),
        filePath: '/path/v2.pdf',
        fileName: 'doc_v2.pdf',
        fileSize: 2048,
        creatorId: 'user-2',
        creator: { id: 'user-2', username: 'user2', name: 'User 2' },
        createdAt: new Date('2026-01-15T14:30:00Z'),
      };

      mockPrismaService.document.findUnique.mockResolvedValue({
        id: documentId,
        title: 'Test Document',
        deletedAt: null,
      });

      mockPrismaService.documentVersion.findFirst
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const result = await service.compareVersions(documentId, '1.0', '1.1', userId);

      expect(result).toEqual({
        documentId,
        documentTitle: 'Test Document',
        version1: {
          version: '1.0',
          fileName: 'doc_v1.pdf',
          fileSize: 1024,
          creator: { id: 'user-1', username: 'user1', name: 'User 1' },
          createdAt: version1.createdAt,
        },
        version2: {
          version: '1.1',
          fileName: 'doc_v2.pdf',
          fileSize: 2048,
          creator: { id: 'user-2', username: 'user2', name: 'User 2' },
          createdAt: version2.createdAt,
        },
        differences: {
          fileSizeChange: 1024, // +1024 bytes
          fileNameChanged: true,
          creatorChanged: true,
          timeDiff: expect.any(Number), // days between versions
        },
      });
    });

    it('should handle same file versions (no differences)', async () => {
      const creator = { id: 'user-1', username: 'user1', name: 'User 1' };
      const version1 = {
        id: 'v1',
        version: new Decimal('1.0'),
        filePath: '/path/v1.pdf',
        fileName: 'doc.pdf',
        fileSize: 1024,
        creatorId: 'user-1',
        creator,
        createdAt: new Date('2026-01-01T10:00:00Z'),
      };

      const version2 = {
        id: 'v2',
        version: new Decimal('1.1'),
        filePath: '/path/v2.pdf',
        fileName: 'doc.pdf',
        fileSize: 1024,
        creatorId: 'user-1',
        creator,
        createdAt: new Date('2026-01-01T10:00:00Z'),
      };

      mockPrismaService.document.findUnique.mockResolvedValue({
        id: documentId,
        title: 'Test Document',
        deletedAt: null,
      });

      mockPrismaService.documentVersion.findFirst
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      const result = await service.compareVersions(documentId, '1.0', '1.1', userId);

      expect(result.differences).toEqual({
        fileSizeChange: 0,
        fileNameChanged: false,
        creatorChanged: false,
        timeDiff: 0,
      });
    });
  });

  describe('rollbackVersion', () => {
    const documentId = 'doc-123';
    const userId = 'user-456';
    const reason = '恢复到已批准版本';

    it('should throw error if document does not exist', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(null);

      await expect(
        service.rollbackVersion(documentId, '1.0', reason, userId)
      ).rejects.toThrow(
        new BusinessException(ErrorCode.NOT_FOUND, '文档不存在或已被删除')
      );
    });

    it('should throw error if target version does not exist', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue({
        id: documentId,
        deletedAt: null,
      });
      mockPrismaService.documentVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.rollbackVersion(documentId, '1.0', reason, userId)
      ).rejects.toThrow(
        new BusinessException(ErrorCode.NOT_FOUND, '版本 1.0 不存在')
      );
    });

    it('should rollback to target version and create new version', async () => {
      const targetVersion = {
        id: 'v1',
        version: new Decimal('1.0'),
        filePath: '/path/v1.pdf',
        fileName: 'doc_v1.pdf',
        fileSize: 1024,
        creatorId: 'user-1',
        createdAt: new Date('2026-01-01'),
      };

      const document = {
        id: documentId,
        version: new Decimal('2.0'),
        filePath: '/path/current.pdf',
        fileName: 'doc_current.pdf',
        fileSize: 2048,
        status: 'effective',
        number: 'DOC-001',
        deletedAt: null,
      };

      mockPrismaService.document.findUnique.mockResolvedValue(document);
      mockPrismaService.documentVersion.findFirst.mockResolvedValue(targetVersion);
      mockPrismaService.documentVersion.create.mockResolvedValue({});
      mockPrismaService.document.updateMany.mockResolvedValue({ count: 1 });
      mockOperationLogService.log.mockResolvedValue(undefined);

      const result = await service.rollbackVersion(documentId, '1.0', reason, userId);

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe('2.1');
      expect(result.rolledBackFrom).toBe('1.0');
      expect(mockPrismaService.documentVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentId,
          version: new Decimal('2.0'),
          filePath: '/path/current.pdf',
          fileName: 'doc_current.pdf',
          fileSize: 2048,
          creatorId: userId,
        }),
      });
      expect(mockPrismaService.document.updateMany).toHaveBeenCalledWith({
        where: { id: documentId, version: new Decimal('2.0') },
        data: {
          version: new Decimal('2.1'),
          filePath: '/path/v1.pdf',
          fileName: 'doc_v1.pdf',
          fileSize: 1024,
        },
      });
      expect(mockOperationLogService.log).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        action: 'rollback_version',
        module: 'document',
        objectId: documentId,
        objectType: 'document',
        details: expect.objectContaining({
          fromVersion: '2.0',
          targetVersion: '1.0',
          newVersion: '2.1',
          reason,
        }),
      }));
    });

    it('should reject stale rollback when document version changed', async () => {
      const targetVersion = {
        id: 'v1',
        version: new Decimal('1.0'),
        filePath: '/path/v1.pdf',
        fileName: 'doc_v1.pdf',
        fileSize: 1024,
      };
      const document = {
        id: documentId,
        version: new Decimal('2.0'),
        filePath: '/path/current.pdf',
        fileName: 'doc_current.pdf',
        fileSize: 2048,
        status: 'effective',
        deletedAt: null,
      };

      mockPrismaService.document.findUnique.mockResolvedValue(document);
      mockPrismaService.documentVersion.findFirst.mockResolvedValue(targetVersion);
      mockPrismaService.documentVersion.create.mockResolvedValue({});
      mockPrismaService.document.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.rollbackVersion(documentId, '1.0', reason, userId),
      ).rejects.toThrow(
        new BusinessException(ErrorCode.CONFLICT, '文档版本已变化，请刷新后重试'),
      );
      expect(mockOperationLogService.log).not.toHaveBeenCalled();
    });

    it('should reject blank rollback reason before starting transaction', async () => {
      await expect(
        service.rollbackVersion(documentId, '1.0', '   ', userId),
      ).rejects.toThrow(
        new BusinessException(ErrorCode.VALIDATION_ERROR, '回滚原因不能为空'),
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
