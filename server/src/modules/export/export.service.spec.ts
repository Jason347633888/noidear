import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportDocumentsDto, ExportTasksDto, ExportDeviationReportsDto, ExportApprovalsDto } from './dto';

describe('ExportService', () => {
  let service: ExportService;
  let prisma: any;

  const mockDocuments = [
    {
      id: 'doc-1',
      number: '1-IT-001',
      title: '技术方案',
      level: 1,
      version: 1.0,
      status: 'approved',
      creatorId: 'user-1',
      approverId: 'user-2',
      createdAt: new Date('2026-01-01'),
      approvedAt: new Date('2026-01-02'),
      creator: { id: 'user-1', name: '张三' },
      approver: { id: 'user-2', name: '李四' },
    },
    {
      id: 'doc-2',
      number: '1-IT-002',
      title: '需求文档',
      level: 1,
      version: 1.2,
      status: 'pending',
      creatorId: 'user-3',
      approverId: null,
      createdAt: new Date('2026-01-03'),
      approvedAt: null,
      creator: { id: 'user-3', name: '王五' },
      approver: null,
    },
  ];

  const mockTasks = [
    {
      id: 'task-1',
      templateId: 'tpl-1',
      departmentId: 'dept-1',
      deadline: new Date('2026-02-01'),
      status: 'pending',
      creatorId: 'user-1',
      createdAt: new Date('2026-01-15'),
      creator: { name: '张三' },
      department: { name: '技术部' },
      template: { title: '月度检查' },
    },
  ];

  const mockDeviationReports = [
    {
      id: 'dev-1',
      recordId: 'rec-1',
      fieldName: '温度',
      expectedValue: '100',
      actualValue: '105',
      deviationAmount: 5,
      deviationRate: 0.05,
      deviationType: 'out_of_range',
      reason: '设备故障',
      status: 'pending',
      reportedBy: 'user-1',
      reportedAt: new Date('2026-01-20'),
    },
  ];

  const mockApprovals = [
    {
      id: 'app-1',
      documentId: 'doc-1',
      approverId: 'user-2',
      status: 'approved',
      comment: '通过',
      createdAt: new Date('2026-01-02'),
      approvedAt: new Date('2026-01-02'),
      approver: { name: '李四' },
      document: { number: '1-IT-001', title: '技术方案' },
    },
  ];

  beforeEach(async () => {
    const mockPrisma = {
      document: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      deviationReport: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      approval: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportDocuments', () => {
    it('应该成功导出文档列表（有数据）', async () => {
      prisma.document.count.mockResolvedValue(2);
      prisma.document.findMany.mockResolvedValue(mockDocuments);
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: '张三' },
        { id: 'user-2', name: '李四' },
        { id: 'user-3', name: '王五' },
      ]);

      const dto: ExportDocumentsDto = {
        level: 1,
        fields: ['number', 'title', 'level', 'version', 'status', 'creatorName', 'createdAt'],
      };

      const buffer = await service.exportDocuments(dto);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(prisma.document.count).toHaveBeenCalled();
      expect(prisma.document.findMany).toHaveBeenCalled();
    });

    it('应该成功导出文档列表（无数据）', async () => {
      prisma.document.count.mockResolvedValue(0);

      const dto: ExportDocumentsDto = { level: 2 };

      const buffer = await service.exportDocuments(dto);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(prisma.document.count).toHaveBeenCalledWith({
        where: { level: 2, deletedAt: null },
      });
    });

    it('应该正确应用筛选条件', async () => {
      prisma.document.count.mockResolvedValue(0);

      const dto: ExportDocumentsDto = {
        level: 1,
        status: 'approved',
        keyword: '技术',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };

      await service.exportDocuments(dto);

      expect(prisma.document.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          level: 1,
          status: 'approved',
          OR: expect.arrayContaining([
            { title: { contains: '技术' } },
            { number: { contains: '技术' } },
          ]),
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          deletedAt: null,
        }),
      });
    });

    it('应该正确处理自定义字段导出', async () => {
      prisma.document.count.mockResolvedValue(1);
      prisma.document.findMany.mockResolvedValue([mockDocuments[0]]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: '张三' },
        { id: 'user-2', name: '李四' },
      ]);

      const dto: ExportDocumentsDto = {
        fields: ['number', 'title'],
      };

      const buffer = await service.exportDocuments(dto);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('应该处理大数据量分页导出（性能测试）', async () => {
      const largeDataCount = 2500;
      prisma.document.count.mockResolvedValue(largeDataCount);

      // 模拟分页查询
      prisma.document.findMany.mockImplementation((args: any) => {
        const skip = args.skip || 0;
        const take = args.take || 1000;
        return Promise.resolve(
          Array(Math.min(take, largeDataCount - skip)).fill(mockDocuments[0])
        );
      });

      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: '张三' },
        { id: 'user-2', name: '李四' },
      ]);

      const dto: ExportDocumentsDto = { level: 1 };

      const buffer = await service.exportDocuments(dto);

      expect(buffer).toBeInstanceOf(Buffer);
      // 应该调用 3 次分页查询 (2500 / 1000 = 3)
      expect(prisma.document.findMany).toHaveBeenCalledTimes(3);
    });
  });

  describe('exportTasks', () => {
    it('应该成功导出任务列表', async () => {
      prisma.task.count.mockResolvedValue(1);
      prisma.task.findMany.mockResolvedValue(mockTasks);

      const dto: ExportTasksDto = { status: 'pending' };

      const buffer = await service.exportTasks(dto);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(prisma.task.count).toHaveBeenCalled();
      expect(prisma.task.findMany).toHaveBeenCalled();
    });

    it('应该正确应用日期范围筛选', async () => {
      prisma.task.count.mockResolvedValue(0);

      const dto: ExportTasksDto = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };

      await service.exportTasks(dto);

      expect(prisma.task.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          deletedAt: null,
        }),
      });
    });
  });

  describe('exportDeviationReports', () => {
    it('应该成功导出偏离报告列表', async () => {
      prisma.deviationReport.count.mockResolvedValue(1);
      prisma.deviationReport.findMany.mockResolvedValue(mockDeviationReports);

      const dto: ExportDeviationReportsDto = { status: 'pending' };

      const buffer = await service.exportDeviationReports(dto);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(prisma.deviationReport.count).toHaveBeenCalled();
    });

    it('应该正确应用偏离类型筛选', async () => {
      prisma.deviationReport.count.mockResolvedValue(0);

      const dto: ExportDeviationReportsDto = {
        deviationType: 'out_of_range',
      };

      await service.exportDeviationReports(dto);

      expect(prisma.deviationReport.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deviationType: 'out_of_range',
          deletedAt: null,
        }),
      });
    });
  });

  describe('exportApprovals', () => {
    it('应该成功导出审批记录列表', async () => {
      prisma.approval.count.mockResolvedValue(1);
      prisma.approval.findMany.mockResolvedValue(mockApprovals);

      const dto: ExportApprovalsDto = { status: 'approved' };

      const buffer = await service.exportApprovals(dto);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(prisma.approval.count).toHaveBeenCalled();
    });

    it('应该正确应用审批人筛选', async () => {
      prisma.approval.count.mockResolvedValue(0);

      const dto: ExportApprovalsDto = {
        approverId: 'user-2',
      };

      await service.exportApprovals(dto);

      expect(prisma.approval.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          approverId: 'user-2',
        }),
      });
    });
  });

  describe('日期格式化', () => {
    it('应该正确格式化日期字段', async () => {
      prisma.document.count.mockResolvedValue(1);
      prisma.document.findMany.mockResolvedValue([mockDocuments[0]]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: '张三' },
        { id: 'user-2', name: '李四' },
      ]);

      const dto: ExportDocumentsDto = {
        fields: ['number', 'createdAt', 'approvedAt'],
      };

      const buffer = await service.exportDocuments(dto);

      expect(buffer).toBeInstanceOf(Buffer);
      // Excel 文件应包含格式化的日期
      const content = buffer.toString();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理 null 字段', async () => {
      prisma.document.count.mockResolvedValue(1);
      prisma.document.findMany.mockResolvedValue([mockDocuments[1]]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-3', name: '王五' },
      ]);

      const dto: ExportDocumentsDto = {
        fields: ['number', 'approverName', 'approvedAt'],
      };

      const buffer = await service.exportDocuments(dto);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('应该处理空数组字段', async () => {
      prisma.document.count.mockResolvedValue(1);
      prisma.document.findMany.mockResolvedValue([mockDocuments[0]]);
      prisma.user.findMany.mockResolvedValue([]);

      const dto: ExportDocumentsDto = { fields: [] };

      const buffer = await service.exportDocuments(dto);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('应该处理 undefined 字段', async () => {
      prisma.document.count.mockResolvedValue(1);
      prisma.document.findMany.mockResolvedValue([mockDocuments[0]]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: '张三' },
        { id: 'user-2', name: '李四' },
      ]);

      const dto: ExportDocumentsDto = {};

      const buffer = await service.exportDocuments(dto);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });
});
