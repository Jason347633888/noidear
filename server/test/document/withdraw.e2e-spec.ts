import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from '../../src/modules/document/document.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StorageService } from '../../src/common/services/storage.service';
import { NotificationService } from '../../src/modules/notification/notification.service';
import { OperationLogService } from '../../src/modules/operation-log/operation-log.service';
import { BusinessException, ErrorCode } from '../../src/common/exceptions/business.exception';

describe('DocumentService - Withdraw', () => {
  let service: DocumentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    document: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    approval: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStorageService = {};
  const mockNotificationService = { create: jest.fn() };
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

    jest.clearAllMocks();
  });

  describe('withdraw', () => {
    const userId = 'user-123';
    const documentId = 'doc-456';

    it('应该成功撤回待审批的文档', async () => {
      const mockDocument = {
        id: documentId,
        number: '1-HR-001',
        title: '测试文档',
        status: 'pending',
        creatorId: userId,
        deletedAt: null,
      };

      const mockApproval = {
        id: 'approval-789',
        documentId,
        status: 'pending',
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      mockPrismaService.approval.findFirst.mockResolvedValue(mockApproval);
      mockPrismaService.approval.update.mockResolvedValue({ ...mockApproval, status: 'withdrawn' });
      mockPrismaService.document.update.mockResolvedValue({ ...mockDocument, status: 'draft' });

      const result = await service.withdraw(documentId, userId);

      expect(result.status).toBe('draft');
      expect(mockPrismaService.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: { status: 'draft' },
      });
      expect(mockPrismaService.approval.update).toHaveBeenCalledWith({
        where: { id: mockApproval.id },
        data: { status: 'withdrawn' },
      });
      expect(mockOperationLogService.log).toHaveBeenCalled();
    });

    it('应该拒绝撤回不存在的文档', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(null);

      await expect(service.withdraw(documentId, userId)).rejects.toThrow(BusinessException);
      await expect(service.withdraw(documentId, userId)).rejects.toThrow('文档不存在');
    });

    it('应该拒绝非创建者撤回文档', async () => {
      const mockDocument = {
        id: documentId,
        number: '1-HR-001',
        status: 'pending',
        creatorId: 'other-user',
        deletedAt: null,
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      await expect(service.withdraw(documentId, userId)).rejects.toThrow(BusinessException);
      await expect(service.withdraw(documentId, userId)).rejects.toThrow('无权访问文档');
    });

    it('应该拒绝撤回非待审批状态的文档', async () => {
      const mockDocument = {
        id: documentId,
        status: 'approved',
        creatorId: userId,
        deletedAt: null,
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      await expect(service.withdraw(documentId, userId)).rejects.toThrow(BusinessException);
      await expect(service.withdraw(documentId, userId)).rejects.toThrow('只能撤回待审批状态的文档');
    });

    it('应该拒绝撤回没有待处理审批记录的文档', async () => {
      const mockDocument = {
        id: documentId,
        status: 'pending',
        creatorId: userId,
        deletedAt: null,
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      mockPrismaService.approval.findFirst.mockResolvedValue(null);

      await expect(service.withdraw(documentId, userId)).rejects.toThrow(BusinessException);
      await expect(service.withdraw(documentId, userId)).rejects.toThrow('该文档没有待处理的审批记录');
    });
  });
});
