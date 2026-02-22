import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowTemplateService } from './workflow-template.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('WorkflowTemplateService', () => {
  let service: WorkflowTemplateService;
  let prisma: PrismaService;

  const mockPrismaService = {
    workflowTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowTemplateService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WorkflowTemplateService>(WorkflowTemplateService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建工作流模板并自动生成编码', async () => {
      const createDto: CreateWorkflowTemplateDto = {
        name: '文档审批流程',
        category: 'document',
        departmentId: 'dept_001',
        steps: [
          {
            index: 0,
            name: '部门主管审批',
            assigneeRole: 'manager',
            parallelMode: false,
            timeoutHours: 24,
          },
        ],
      };

      const expectedTemplate = {
        id: 'template_001',
        code: 'document_dept_001_001',
        name: '文档审批流程',
        category: 'document',
        departmentId: 'dept_001',
        steps: createDto.steps,
        version: 1,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock 查询最大序号
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(null);
      mockPrismaService.workflowTemplate.create.mockResolvedValue(expectedTemplate);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedTemplate);
      expect(result.code).toMatch(/^document_dept_001_\d{3}$/);
      expect(mockPrismaService.workflowTemplate.create).toHaveBeenCalled();
    });

    it('应该为全局模板生成正确的编码格式', async () => {
      const createDto: CreateWorkflowTemplateDto = {
        name: '全局审批流程',
        category: 'document',
        steps: [
          {
            index: 0,
            name: '审批步骤',
            assigneeRole: 'admin',
            parallelMode: false,
            timeoutHours: 24,
          },
        ],
      };

      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue(null);
      mockPrismaService.workflowTemplate.create.mockResolvedValue({
        id: 'template_002',
        code: 'document_global_001',
        ...createDto,
        version: 1,
        status: 'active',
      });

      const result = await service.create(createDto);

      expect(result.code).toMatch(/^document_global_\d{3}$/);
    });

    it('应该正确递增序号', async () => {
      const createDto: CreateWorkflowTemplateDto = {
        name: '文档审批流程',
        category: 'document',
        departmentId: 'dept_001',
        steps: [],
      };

      // Mock 已存在的模板（序号 005）
      mockPrismaService.workflowTemplate.findFirst.mockResolvedValue({
        code: 'document_dept_001_005',
      });

      mockPrismaService.workflowTemplate.create.mockResolvedValue({
        id: 'template_003',
        code: 'document_dept_001_006',
        ...createDto,
      });

      const result = await service.create(createDto);

      expect(result.code).toBe('document_dept_001_006');
    });
  });

  describe('findAll', () => {
    it('应该返回分页的工作流模板列表', async () => {
      const templates = [
        {
          id: 'template_001',
          code: 'document_dept_001_001',
          name: '模板1',
          category: 'document',
        },
        {
          id: 'template_002',
          code: 'document_dept_001_002',
          name: '模板2',
          category: 'document',
        },
      ];

      mockPrismaService.workflowTemplate.findMany.mockResolvedValue(templates);
      mockPrismaService.workflowTemplate.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(templates);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('应该支持按类别筛选', async () => {
      mockPrismaService.workflowTemplate.findMany.mockResolvedValue([]);
      mockPrismaService.workflowTemplate.count.mockResolvedValue(0);

      await service.findAll({ category: 'document' });

      expect(mockPrismaService.workflowTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'document' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回指定 ID 的工作流模板', async () => {
      const template = {
        id: 'template_001',
        code: 'document_dept_001_001',
        name: '模板1',
      };

      mockPrismaService.workflowTemplate.findUnique.mockResolvedValue(template);

      const result = await service.findOne('template_001');

      expect(result).toEqual(template);
    });

    it('模板不存在时应该抛出 NotFoundException', async () => {
      mockPrismaService.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non_existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该成功更新工作流模板并递增版本号', async () => {
      const existingTemplate = {
        id: 'template_001',
        version: 1,
      };

      const updateDto = {
        name: '更新后的名称',
      };

      const updatedTemplate = {
        ...existingTemplate,
        ...updateDto,
        version: 2,
      };

      mockPrismaService.workflowTemplate.findUnique.mockResolvedValue(existingTemplate);
      mockPrismaService.workflowTemplate.update.mockResolvedValue(updatedTemplate);

      const result = await service.update('template_001', updateDto);

      expect(result.version).toBe(2);
      expect(mockPrismaService.workflowTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 2,
          }),
        }),
      );
    });
  });

  describe('disable', () => {
    it('应该成功停用工作流模板', async () => {
      const template = {
        id: 'template_001',
        status: 'active',
      };

      mockPrismaService.workflowTemplate.findUnique.mockResolvedValue(template);
      mockPrismaService.workflowTemplate.update.mockResolvedValue({
        ...template,
        status: 'inactive',
      });

      const result = await service.disable('template_001');

      expect(result.status).toBe('inactive');
    });

    it('模板不存在时应该抛出 NotFoundException', async () => {
      mockPrismaService.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(service.disable('non_existent')).rejects.toThrow(NotFoundException);
    });
  });
});
