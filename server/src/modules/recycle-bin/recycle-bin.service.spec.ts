import { Test, TestingModule } from '@nestjs/testing';
import { RecycleBinService } from './recycle-bin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('RecycleBinService', () => {
  let service: RecycleBinService;
  let prisma: PrismaService;
  let operationLog: OperationLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecycleBinService,
        {
          provide: PrismaService,
          useValue: {
            document: {
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            template: {
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            task: {
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: OperationLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecycleBinService>(RecycleBinService);
    prisma = module.get<PrismaService>(PrismaService);
    operationLog = module.get<OperationLogService>(OperationLogService);
  });

  describe('findAll', () => {
    it('应返回已删除文档的分页列表', async () => {
      const mockDocuments = [
        {
          id: '1',
          title: '已删除文档',
          deletedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.document, 'findMany').mockResolvedValue(mockDocuments as any);
      jest.spyOn(prisma.document, 'count').mockResolvedValue(1);

      const result = await service.findAll('document', 1, 10, undefined, 'user123', 'admin');

      expect(result.list).toEqual(mockDocuments);
      expect(result.total).toBe(1);
      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { deletedAt: { not: null } },
        skip: 0,
        take: 10,
        orderBy: { deletedAt: 'desc' },
      });
    });

    it('应支持关键词搜索', async () => {
      jest.spyOn(prisma.document, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.document, 'count').mockResolvedValue(0);

      await service.findAll('document', 1, 10, 'test', 'user123', 'admin');

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: { not: null },
          OR: [
            { title: { contains: 'test' } },
            { number: { contains: 'test' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { deletedAt: 'desc' },
      });
    });

    it('应支持模板类型查询', async () => {
      jest.spyOn(prisma.template, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.template, 'count').mockResolvedValue(0);

      await service.findAll('template', 1, 10, undefined, 'user123', 'admin');

      expect(prisma.template.findMany).toHaveBeenCalled();
    });

    it('应支持任务类型查询', async () => {
      jest.spyOn(prisma.task, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.task, 'count').mockResolvedValue(0);

      await service.findAll('task', 1, 10, undefined, 'user123', 'admin');

      expect(prisma.task.findMany).toHaveBeenCalled();
    });

    it('应拒绝无效的类型', async () => {
      await expect(service.findAll('invalid' as any, 1, 10, undefined, 'user123', 'admin'))
        .rejects
        .toThrow(BusinessException);
    });

    it('应拒绝非管理员访问', async () => {
      await expect(service.findAll('document', 1, 10, undefined, 'user123', 'user'))
        .rejects
        .toThrow(BusinessException);
    });
  });

  describe('restore', () => {
    it('应恢复已删除的文档', async () => {
      const mockDocument = {
        id: '1',
        title: '测试文档',
        deletedAt: new Date(),
      };

      jest.spyOn(prisma.document, 'update').mockResolvedValue(mockDocument as any);

      await service.restore('document', '1', 'user123', 'admin');

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: null },
      });
      expect(operationLog.log).toHaveBeenCalledWith({
        userId: 'user123',
        action: 'restore',
        module: 'recycle-bin',
        objectId: '1',
        objectType: 'document',
        details: expect.any(Object),
      });
    });

    it('应恢复已删除的模板', async () => {
      jest.spyOn(prisma.template, 'update').mockResolvedValue({} as any);

      await service.restore('template', '1', 'user123', 'admin');

      expect(prisma.template.update).toHaveBeenCalled();
    });

    it('应恢复已删除的任务', async () => {
      jest.spyOn(prisma.task, 'update').mockResolvedValue({} as any);

      await service.restore('task', '1', 'user123', 'admin');

      expect(prisma.task.update).toHaveBeenCalled();
    });

    it('应拒绝非管理员恢复', async () => {
      await expect(service.restore('document', '1', 'user123', 'user'))
        .rejects
        .toThrow(BusinessException);
    });
  });

  describe('permanentDelete', () => {
    it('应永久删除文档', async () => {
      jest.spyOn(prisma.document, 'delete').mockResolvedValue({} as any);

      await service.permanentDelete('document', '1', 'user123', 'admin');

      expect(prisma.document.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(operationLog.log).toHaveBeenCalledWith({
        userId: 'user123',
        action: 'permanent_delete',
        module: 'recycle-bin',
        objectId: '1',
        objectType: 'document',
        details: expect.any(Object),
      });
    });

    it('应永久删除模板', async () => {
      jest.spyOn(prisma.template, 'delete').mockResolvedValue({} as any);

      await service.permanentDelete('template', '1', 'user123', 'admin');

      expect(prisma.template.delete).toHaveBeenCalled();
    });

    it('应永久删除任务', async () => {
      jest.spyOn(prisma.task, 'delete').mockResolvedValue({} as any);

      await service.permanentDelete('task', '1', 'user123', 'admin');

      expect(prisma.task.delete).toHaveBeenCalled();
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
      jest.spyOn(prisma.document, 'update').mockResolvedValue({} as any);

      await service.batchRestore('document', ids, 'user123', 'admin');

      expect(prisma.document.update).toHaveBeenCalledTimes(3);
      ids.forEach((id) => {
        expect(prisma.document.update).toHaveBeenCalledWith({
          where: { id },
          data: { deletedAt: null },
        });
      });
    });

    it('应处理空数组', async () => {
      await service.batchRestore('document', [], 'user123', 'admin');

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
      jest.spyOn(prisma.document, 'delete').mockResolvedValue({} as any);

      await service.batchPermanentDelete('document', ids, 'user123', 'admin');

      expect(prisma.document.delete).toHaveBeenCalledTimes(3);
      ids.forEach((id) => {
        expect(prisma.document.delete).toHaveBeenCalledWith({
          where: { id },
        });
      });
    });

    it('应处理空数组', async () => {
      await service.batchPermanentDelete('document', [], 'user123', 'admin');

      expect(prisma.document.delete).not.toHaveBeenCalled();
    });

    it('应拒绝非管理员批量永久删除', async () => {
      await expect(service.batchPermanentDelete('document', ['1'], 'user123', 'user'))
        .rejects
        .toThrow(BusinessException);
    });
  });
});
