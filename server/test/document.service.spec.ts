import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from '../src/modules/document/document.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/common/services/storage.service';
import { NotificationService } from '../src/modules/notification/notification.service';
import { OperationLogService } from '../src/modules/operation-log/operation-log.service';
import { BusinessException } from '../src/common/exceptions/business.exception';

describe('DocumentService', () => {
  let service: DocumentService;
  let prisma: PrismaService;
  let storage: StorageService;
  let notification: NotificationService;
  let operationLog: OperationLogService;

  const mockSnowflake = {
    nextId: jest.fn(() => 'mock-id-123'),
  };

  const mockPrismaService = {
    document: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    pendingNumber: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    numberRule: {
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileStream: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const mockNotificationService = {
    create: jest.fn(),
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
        { provide: 'SnowflakeService', useValue: mockSnowflake },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);
    notification = module.get<NotificationService>(NotificationService);
    operationLog = module.get<OperationLogService>(OperationLogService);

    // 清除所有 mock
    jest.clearAllMocks();
  });

  describe('generateDocumentNumber', () => {
    it('应该优先使用待补齐编号', async () => {
      const mockPending = { id: '1', number: '1-HR-001', level: 1, departmentId: 'dept1', deletedAt: new Date() };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          pendingNumber: {
            findFirst: jest.fn().mockResolvedValue(mockPending),
            delete: jest.fn().mockResolvedValue(mockPending),
          },
        };
        return callback(tx);
      });

      const number = await service['generateDocumentNumber'](1, 'dept1');

      expect(number).toBe('1-HR-001');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('没有待补齐编号时应该生成新编号', async () => {
      const mockDepartment = { id: 'dept1', code: 'HR', name: '人力资源部' };
      const mockRule = { id: 'rule1', sequence: 5, level: 1, departmentId: 'dept1' };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          pendingNumber: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          department: {
            findUnique: jest.fn().mockResolvedValue(mockDepartment),
          },
          $queryRaw: jest.fn().mockResolvedValue([mockRule]),
          numberRule: {
            create: jest.fn(),
            update: jest.fn().mockResolvedValue({ ...mockRule, sequence: 6 }),
          },
        };
        return callback(tx);
      });

      const number = await service['generateDocumentNumber'](1, 'dept1');

      expect(number).toBe('1-HR-006');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('部门不存在时应该抛出异常', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          pendingNumber: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          department: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        service['generateDocumentNumber'](1, 'invalid-dept')
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('remove', () => {
    it('删除文档后应该将编号加入待补齐列表', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        level: 1,
        status: 'draft',
        creatorId: 'user1',
        title: '测试文档',
      };
      const mockCreator = { id: 'user1', departmentId: 'dept1' };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);
      mockPrismaService.user.findUnique.mockResolvedValue(mockCreator);
      mockPrismaService.document.update.mockResolvedValue(mockDocument);
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.pendingNumber.create.mockResolvedValue({});
      mockOperationLogService.log.mockResolvedValue(undefined);

      await service.remove('doc1', 'user1');

      expect(mockPrismaService.pendingNumber.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          level: 1,
          departmentId: 'dept1',
          number: '1-HR-001',
        }),
      });
      expect(mockOperationLogService.log).toHaveBeenCalled();
    });

    it('应该拒绝删除已发布文档', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'approved',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      await expect(service.remove('doc1', 'user1')).rejects.toThrow(
        BusinessException
      );
    });

    it('应该拒绝删除他人文档', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'draft',
        creatorId: 'user2',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      await expect(service.remove('doc1', 'user1')).rejects.toThrow(
        BusinessException
      );
    });
  });

  describe('archive', () => {
    it('应该成功归档已发布文档（管理员）', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        title: '测试文档',
        status: 'approved',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);
      mockPrismaService.document.update.mockResolvedValue({
        ...mockDocument,
        status: 'archived',
        archiveReason: '版本过旧',
      });
      mockOperationLogService.log.mockResolvedValue(undefined);
      mockNotificationService.create.mockResolvedValue(undefined);

      await service.archive('doc1', '版本过旧', 'admin', 'admin');

      expect(mockPrismaService.document.update).toHaveBeenCalledWith({
        where: { id: 'doc1' },
        data: expect.objectContaining({
          status: 'archived',
          archiveReason: '版本过旧',
          archivedBy: 'admin',
        }),
      });
      expect(mockOperationLogService.log).toHaveBeenCalled();
      expect(mockNotificationService.create).toHaveBeenCalled();
    });

    it('应该成功归档已发布文档（创建者）', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        title: '测试文档',
        status: 'approved',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);
      mockPrismaService.document.update.mockResolvedValue({
        ...mockDocument,
        status: 'archived',
        archiveReason: '版本过旧',
      });
      mockOperationLogService.log.mockResolvedValue(undefined);
      mockNotificationService.create.mockResolvedValue(undefined);

      await service.archive('doc1', '版本过旧', 'user1', 'user');

      expect(mockPrismaService.document.update).toHaveBeenCalled();
    });

    it('应该拒绝归档非已发布文档', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'draft',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      await expect(
        service.archive('doc1', '测试', 'admin', 'admin')
      ).rejects.toThrow('只有已发布文档可归档');
    });

    it('应该拒绝非创建者非管理员归档', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'approved',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      // 测试权限校验应该失败，不执行数据库更新
      await expect(
        service.archive('doc1', '测试原因很长很长很长', 'user2', 'user')
      ).rejects.toThrow(BusinessException);

      // 验证没有调用数据库更新（因为权限校验失败）
      expect(mockPrismaService.document.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // NEW-002: findPendingApprovals pagination
  // =========================================================================
  describe('NEW-002: findPendingApprovals pagination', () => {
    it('should accept page and limit parameters', async () => {
      const mockDocs = [
        { id: 'doc-1', status: 'pending', creatorId: 'user-1' },
        { id: 'doc-2', status: 'pending', creatorId: 'user-2' },
      ];
      mockPrismaService.document.findMany.mockResolvedValue(mockDocs);
      mockPrismaService.document.count.mockResolvedValue(25);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'User 1' },
        { id: 'user-2', name: 'User 2' },
      ]);

      const result = await service.findPendingApprovals('admin-1', 'admin', 2, 10);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      mockPrismaService.document.findMany.mockResolvedValue([]);
      mockPrismaService.document.count.mockResolvedValue(0);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findPendingApprovals('admin-1', 'admin');

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply skip based on page and limit', async () => {
      mockPrismaService.document.findMany.mockResolvedValue([]);
      mockPrismaService.document.count.mockResolvedValue(0);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.findPendingApprovals('admin-1', 'admin', 3, 10);

      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should return total count for pagination', async () => {
      mockPrismaService.document.findMany.mockResolvedValue([]);
      mockPrismaService.document.count.mockResolvedValue(42);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findPendingApprovals('admin-1', 'admin', 1, 10);

      expect(result.total).toBe(42);
    });

    it('should paginate for leader role too', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'leader-1',
        departmentId: 'dept-1',
      });
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1' },
      ]);
      mockPrismaService.document.findMany.mockResolvedValue([]);
      mockPrismaService.document.count.mockResolvedValue(0);

      const result = await service.findPendingApprovals('leader-1', 'leader', 1, 5);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
    });
  });

  describe('obsolete', () => {
    it('应该成功作废已发布文档（管理员）', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        title: '测试文档',
        status: 'approved',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);
      mockPrismaService.document.update.mockResolvedValue({
        ...mockDocument,
        status: 'obsolete',
        obsoleteReason: '内容错误',
      });
      mockOperationLogService.log.mockResolvedValue(undefined);
      mockNotificationService.create.mockResolvedValue(undefined);

      await service.obsolete('doc1', '内容错误', 'admin', 'admin');

      expect(mockPrismaService.document.update).toHaveBeenCalledWith({
        where: { id: 'doc1' },
        data: expect.objectContaining({
          status: 'obsolete',
          obsoleteReason: '内容错误',
          obsoletedBy: 'admin',
        }),
      });
      expect(mockOperationLogService.log).toHaveBeenCalled();
      expect(mockNotificationService.create).toHaveBeenCalled();
    });

    it('应该拒绝作废非已发布文档', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'pending',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      await expect(
        service.obsolete('doc1', '测试', 'admin', 'admin')
      ).rejects.toThrow('只有已发布文档可作废');
    });

    it('应该拒绝非管理员作废', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'approved',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      await expect(
        service.obsolete('doc1', '测试原因很长很长很长', 'user1', 'user')
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('restore', () => {
    it('应该成功恢复归档文档（管理员）', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        title: '测试文档',
        status: 'archived',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);
      mockPrismaService.document.update.mockResolvedValue({
        ...mockDocument,
        status: 'approved',
      });
      mockOperationLogService.log.mockResolvedValue(undefined);
      mockNotificationService.create.mockResolvedValue(undefined);

      await service.restore('doc1', '归档误操作，需恢复使用', 'admin', 'admin');

      expect(mockPrismaService.document.update).toHaveBeenCalledWith({
        where: { id: 'doc1' },
        data: {
          status: 'approved',
          archiveReason: null,
          archivedAt: null,
          archivedBy: null,
          obsoleteReason: null,
          obsoletedAt: null,
          obsoletedBy: null,
        },
      });
      expect(mockOperationLogService.log).toHaveBeenCalled();
      expect(mockNotificationService.create).toHaveBeenCalled();
    });

    it('应该拒绝恢复非归档文档', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'approved',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      await expect(
        service.restore('doc1', '测试原因很长很长很长', 'admin', 'admin')
      ).rejects.toThrow('仅归档文档可恢复');
    });

    it('应该拒绝恢复作废文档', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'obsolete',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      await expect(
        service.restore('doc1', '测试原因很长很长很长', 'admin', 'admin')
      ).rejects.toThrow('仅归档文档可恢复');
    });

    it('应该拒绝非管理员恢复', async () => {
      const mockDocument = {
        id: 'doc1',
        number: '1-HR-001',
        status: 'archived',
        creatorId: 'user1',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockDocument as any);

      await expect(
        service.restore('doc1', '测试原因很长很长很长', 'user1', 'user')
      ).rejects.toThrow(BusinessException);
    });
  });
});
