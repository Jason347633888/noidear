import { Test, TestingModule } from '@nestjs/testing';
import { RecycleBinService } from './recycle-bin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { NotificationService } from '../notification/notification.service';
import { DocumentService } from '../document/document.service';
import { StorageService } from '../../common/services';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('RecycleBinService', () => {
  let service: RecycleBinService;
  let prisma: PrismaService;
  let operationLog: OperationLogService;
  let notificationService: NotificationService;
  let storageService: StorageService;

  const mockNotificationService = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockDocumentService = {
    generateDocumentNumber: jest.fn().mockResolvedValue('1-TEST-001'),
  };

  const mockStorageService = {
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecycleBinService,
        {
          provide: PrismaService,
          useValue: {
            document: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            recordTemplate: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            record: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            pendingNumber: {
              create: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
        {
          provide: OperationLogService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: DocumentService,
          useValue: mockDocumentService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<RecycleBinService>(RecycleBinService);
    prisma = module.get<PrismaService>(PrismaService);
    operationLog = module.get<OperationLogService>(OperationLogService);
    notificationService = module.get<NotificationService>(NotificationService);
    storageService = module.get<StorageService>(StorageService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应返回已删除文档的分页列表', async () => {
      const mockDocuments = [
        { id: '1', title: '已删除文档', deletedAt: new Date() },
      ];

      jest.spyOn(prisma.document, 'findMany').mockResolvedValue(mockDocuments as any);
      jest.spyOn(prisma.document, 'count').mockResolvedValue(1);

      const result = await service.findAll('document', 1, 10, undefined, 'user123', 'admin');

      expect(result.list).toEqual(mockDocuments);
      expect(result.total).toBe(1);
    });

    it('应支持关键词搜索', async () => {
      jest.spyOn(prisma.document, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.document, 'count').mockResolvedValue(0);

      await service.findAll('document', 1, 10, 'test', 'user123', 'admin');

      expect(prisma.document.findMany).toHaveBeenCalled();
    });

    it('应支持记录模板类型查询', async () => {
      jest.spyOn(prisma.recordTemplate, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.recordTemplate, 'count').mockResolvedValue(0);

      await service.findAll('record-template', 1, 10, undefined, 'user123', 'admin');

      expect(prisma.recordTemplate.findMany).toHaveBeenCalled();
    });

    it('应支持记录类型查询', async () => {
      jest.spyOn(prisma.record, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.record, 'count').mockResolvedValue(0);

      await service.findAll('record', 1, 10, undefined, 'user123', 'admin');

      expect(prisma.record.findMany).toHaveBeenCalled();
    });

    it('应拒绝无效的类型', async () => {
      await expect(service.findAll('invalid' as any, 1, 10, undefined, 'user123', 'admin'))
        .rejects
        .toThrow(BusinessException);
    });

    it('非管理员应只返回自己的已删除项（不抛出异常）', async () => {
      jest.spyOn(prisma.document, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.document, 'count').mockResolvedValue(0);

      const result = await service.findAll('document', 1, 10, undefined, 'user123', 'user');

      // Non-admin sees their own deleted items (filtered by userId), not an error
      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('restore', () => {
    it('应恢复已删除的文档（无编号冲突）', async () => {
      const mockDocument = {
        id: '1',
        title: '测试文档',
        number: 'DOC-001',
        creatorId: 'creator-1',
        deletedAt: new Date(),
        creator: { id: 'creator-1', departmentId: 'dept-1' },
      };

      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);
      jest.spyOn(prisma.document, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.document, 'update').mockResolvedValue(mockDocument as any);

      await service.restore('document', '1', 'user123', 'admin');

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: null },
      });
      expect(notificationService.create).toHaveBeenCalled();
      expect(operationLog.log).toHaveBeenCalled();
    });

    it('应恢复已删除的记录模板', async () => {
      const mockRecordTemplate = {
        id: '1',
        title: '测试记录模板',
        creatorId: 'creator-1',
        deletedAt: new Date(),
        creator: { id: 'creator-1', departmentId: 'dept-1' },
      };

      jest.spyOn(prisma.recordTemplate, 'findUnique').mockResolvedValue(mockRecordTemplate as any);
      jest.spyOn(prisma.recordTemplate, 'update').mockResolvedValue({} as any);

      await service.restore('record-template', '1', 'user123', 'admin');

      expect(prisma.recordTemplate.update).toHaveBeenCalled();
    });

    it('应恢复已删除的记录', async () => {
      const mockRecord = {
        id: '1',
        creatorId: 'creator-1',
        deletedAt: new Date(),
        creator: { id: 'creator-1' },
      };

      jest.spyOn(prisma.record, 'findUnique').mockResolvedValue(mockRecord as any);
      jest.spyOn(prisma.record, 'update').mockResolvedValue({} as any);

      await service.restore('record', '1', 'user123', 'admin');

      expect(prisma.record.update).toHaveBeenCalled();
    });

    it('应拒绝非管理员恢复', async () => {
      await expect(service.restore('document', '1', 'user123', 'user'))
        .rejects
        .toThrow(BusinessException);
    });
  });

  describe('permanentDelete', () => {
    it('应永久删除文档', async () => {
      const mockDocument = {
        id: '1',
        number: 'DOC-001',
        level: 1,
        filePath: 'path/to/file.pdf',
        deletedAt: new Date(),
        creator: { id: 'creator-1', departmentId: 'dept-1' },
      };

      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);
      jest.spyOn(prisma.document, 'delete').mockResolvedValue({} as any);
      jest.spyOn(prisma.pendingNumber, 'upsert').mockResolvedValue({} as any);

      await service.permanentDelete('document', '1', 'user123', 'admin');

      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(storageService.deleteFile).toHaveBeenCalledWith('path/to/file.pdf');
      expect(operationLog.log).toHaveBeenCalled();
    });

    it('应永久删除记录模板', async () => {
      const mockRecordTemplate = { id: '1', deletedAt: new Date() };

      jest.spyOn(prisma.recordTemplate, 'findUnique').mockResolvedValue(mockRecordTemplate as any);
      jest.spyOn(prisma.recordTemplate, 'delete').mockResolvedValue({} as any);

      await service.permanentDelete('record-template', '1', 'user123', 'admin');

      expect(prisma.recordTemplate.delete).toHaveBeenCalled();
    });

    it('应永久删除记录', async () => {
      const mockRecord = { id: '1', deletedAt: new Date() };

      jest.spyOn(prisma.record, 'findUnique').mockResolvedValue(mockRecord as any);
      jest.spyOn(prisma.record, 'delete').mockResolvedValue({} as any);

      await service.permanentDelete('record', '1', 'user123', 'admin');

      expect(prisma.record.delete).toHaveBeenCalled();
    });

    it('应拒绝非管理员永久删除', async () => {
      await expect(service.permanentDelete('document', '1', 'user123', 'user'))
        .rejects
        .toThrow(BusinessException);
    });
  });

  describe('batchRestore', () => {
    it('应批量恢复多个项目', async () => {
      const ids = ['1', '2', '3'];
      const mockDocument = {
        id: '1',
        title: '测试文档',
        number: 'DOC-001',
        creatorId: 'creator-1',
        deletedAt: new Date(),
        creator: { id: 'creator-1', departmentId: 'dept-1' },
      };

      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);
      jest.spyOn(prisma.document, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.document, 'update').mockResolvedValue({} as any);

      await service.batchRestore('document', ids, 'user123', 'admin');

      expect(prisma.document.findUnique).toHaveBeenCalledTimes(3);
      expect(operationLog.log).toHaveBeenCalled();
    });

    it('应处理空数组', async () => {
      const result = await service.batchRestore('document', [], 'user123', 'admin');

      expect(result).toEqual({ success: true, message: '批量恢复成功' });
      expect(prisma.document.update).not.toHaveBeenCalled();
    });

    it('应拒绝非管理员批量恢复', async () => {
      await expect(service.batchRestore('document', ['1'], 'user123', 'user'))
        .rejects
        .toThrow(BusinessException);
    });
  });

  describe('batchPermanentDelete', () => {
    it('应批量永久删除多个项目', async () => {
      const ids = ['1', '2', '3'];
      const mockDocument = {
        id: '1',
        number: 'DOC-001',
        level: 1,
        filePath: 'path/to/file.pdf',
        deletedAt: new Date(),
        creator: { id: 'creator-1', departmentId: 'dept-1' },
      };

      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);
      jest.spyOn(prisma.document, 'delete').mockResolvedValue({} as any);
      jest.spyOn(prisma.pendingNumber, 'create').mockResolvedValue({} as any);

      await service.batchPermanentDelete('document', ids, 'user123', 'admin');

      expect(prisma.document.findUnique).toHaveBeenCalledTimes(3);
      expect(storageService.deleteFile).toHaveBeenCalledTimes(3);
      expect(operationLog.log).toHaveBeenCalled();
    });

    it('应处理空数组', async () => {
      const result = await service.batchPermanentDelete('document', [], 'user123', 'admin');

      expect(result).toEqual({ success: true, message: '批量永久删除成功' });
      expect(prisma.document.delete).not.toHaveBeenCalled();
    });

    it('应拒绝非管理员批量永久删除', async () => {
      await expect(service.batchPermanentDelete('document', ['1'], 'user123', 'user'))
        .rejects
        .toThrow(BusinessException);
    });
  });
});
