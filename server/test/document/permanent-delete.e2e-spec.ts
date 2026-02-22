import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from '../../src/modules/document/document.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StorageService } from '../../src/common/services/storage.service';
import { NotificationService } from '../../src/modules/notification/notification.service';
import { OperationLogService } from '../../src/modules/operation-log/operation-log.service';
import { BusinessException, ErrorCode } from '../../src/common/exceptions/business.exception';

describe('DocumentService - Permanent Delete', () => {
  let service: DocumentService;
  let prisma: PrismaService;
  let storage: StorageService;

  const mockPrismaService = {
    document: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    documentVersion: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    approval: {
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockStorageService = {
    deleteFile: jest.fn(),
  };

  const mockNotificationService = {};
  const mockOperationLogService = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: OperationLogService, useValue: mockOperationLogService },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);

    jest.clearAllMocks();
  });

  describe('permanentDelete', () => {
    const userId = 'admin-123';
    const documentId = 'doc-456';

    it('应该允许管理员物理删除文档', async () => {
      const mockUser = {
        id: userId,
        role: 'admin',
      };

      const mockDocument = {
        id: documentId,
        number: '1-HR-001',
        title: '测试文档',
        filePath: 'documents/level1/test.pdf',
        deletedAt: new Date(),
      };

      const mockVersions = [
        { filePath: 'documents/level1/test-v1.pdf' },
        { filePath: 'documents/level1/test-v2.pdf' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      mockPrismaService.documentVersion.findMany.mockResolvedValue(mockVersions);
      mockPrismaService.documentVersion.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.approval.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.document.delete.mockResolvedValue(mockDocument);
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await service.permanentDelete(documentId, userId);

      expect(result.success).toBe(true);
      expect(mockPrismaService.document.delete).toHaveBeenCalledWith({
        where: { id: documentId },
      });
      expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(3); // 主文件 + 2个版本
      expect(mockOperationLogService.log).toHaveBeenCalled();
    });

    it('应该拒绝非管理员物理删除文档', async () => {
      const mockUser = {
        id: userId,
        role: 'user',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.permanentDelete(documentId, userId)).rejects.toThrow(BusinessException);
      await expect(service.permanentDelete(documentId, userId)).rejects.toThrow('只有管理员可以物理删除文档');
    });

    it('应该拒绝物理删除不存在的文档', async () => {
      const mockUser = {
        id: userId,
        role: 'admin',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.document.findUnique.mockResolvedValue(null);

      await expect(service.permanentDelete(documentId, userId)).rejects.toThrow(BusinessException);
      await expect(service.permanentDelete(documentId, userId)).rejects.toThrow('文档不存在');
    });

    it('应该拒绝物理删除未软删除的文档', async () => {
      const mockUser = {
        id: userId,
        role: 'admin',
      };

      const mockDocument = {
        id: documentId,
        number: '1-HR-001',
        deletedAt: null, // 未软删除
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      await expect(service.permanentDelete(documentId, userId)).rejects.toThrow(BusinessException);
      await expect(service.permanentDelete(documentId, userId)).rejects.toThrow('只能物理删除已软删除的文档');
    });

    it('应该处理没有版本历史的文档', async () => {
      const mockUser = {
        id: userId,
        role: 'admin',
      };

      const mockDocument = {
        id: documentId,
        number: '1-HR-001',
        title: '测试文档',
        filePath: 'documents/level1/test.pdf',
        deletedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      mockPrismaService.documentVersion.findMany.mockResolvedValue([]);
      mockPrismaService.documentVersion.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.approval.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.document.delete.mockResolvedValue(mockDocument);
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await service.permanentDelete(documentId, userId);

      expect(result.success).toBe(true);
      expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(1); // 只有主文件
    });
  });
});
