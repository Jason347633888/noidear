import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowInstanceService } from './workflow-instance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('WorkflowInstanceService', () => {
  let service: WorkflowInstanceService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    workflowTemplate: {
      findUnique: jest.fn(),
    },
    workflowInstance: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    workflowTask: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
  };

  const mockNotificationService = {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    findMany: jest.fn().mockResolvedValue([]),
    markAsRead: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowInstanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<WorkflowInstanceService>(WorkflowInstanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建工作流实例并自动创建第一步任务', async () => {
      const createDto = {
        templateId: 'tpl_001',
        resourceType: 'document',
        resourceId: 'doc_001',
        resourceTitle: '生产工艺文件',
      };

      const mockTemplate = {
        id: 'tpl_001',
        steps: [
          { index: 0, name: '部门主管审批', assigneeRole: 'manager', timeoutHours: 24 },
          { index: 1, name: '质量部审批', assigneeRole: 'quality_manager', timeoutHours: 48 },
        ],
        status: 'active',
      };

      const mockUser = {
        id: 'user_001',
        username: 'testuser',
        roleId: 'role_manager',
      };

      const mockInstance = {
        id: 'inst_001',
        ...createDto,
        initiatorId: 'user_001',
        status: 'pending',
        currentStep: 0,
      };

      const mockTask = {
        id: 'task_001',
        instanceId: 'inst_001',
        stepIndex: 0,
        stepName: '部门主管审批',
        assigneeId: 'user_001',
        status: 'pending',
        dueAt: expect.any(Date),
      };

      mockPrismaService.workflowTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.workflowInstance.create.mockResolvedValue(mockInstance);
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: 'in_progress',
      });
      mockPrismaService.workflowTask.create.mockResolvedValue(mockTask);

      const result = await service.create(createDto, 'user_001');

      expect(result).toEqual(mockInstance);
      expect(mockPrismaService.workflowTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'tpl_001' },
      });
      expect(mockPrismaService.workflowInstance.create).toHaveBeenCalled();
      expect(mockPrismaService.workflowTask.create).toHaveBeenCalled();
    });

    it('应该在模板不存在时抛出 NotFoundException', async () => {
      const createDto = {
        templateId: 'non_existent',
        resourceType: 'document',
        resourceId: 'doc_001',
        resourceTitle: '测试文件',
      };

      mockPrismaService.workflowTemplate.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'user_001')).rejects.toThrow(NotFoundException);
    });

    it('应该在模板已停用时抛出 BadRequestException', async () => {
      const createDto = {
        templateId: 'tpl_001',
        resourceType: 'document',
        resourceId: 'doc_001',
        resourceTitle: '测试文件',
      };

      const mockTemplate = {
        id: 'tpl_001',
        status: 'inactive',
        steps: [],
      };

      mockPrismaService.workflowTemplate.findUnique.mockResolvedValue(mockTemplate);

      await expect(service.create(createDto, 'user_001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('应该成功取消工作流（发起人）', async () => {
      const instanceId = 'inst_001';
      const cancelDto = { cancelReason: '业务需求变更' };
      const userId = 'user_001';

      const mockInstance = {
        id: 'inst_001',
        initiatorId: 'user_001',
        status: 'in_progress',
      };

      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: 'cancelled',
        cancelReason: cancelDto.cancelReason,
      });

      const result = await service.cancel(instanceId, cancelDto, userId, 'user');

      expect(result.status).toBe('cancelled');
      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: instanceId },
        data: {
          status: 'cancelled',
          cancelReason: cancelDto.cancelReason,
        },
      });
    });

    it('应该成功取消工作流（管理员）', async () => {
      const instanceId = 'inst_001';
      const cancelDto = { cancelReason: '管理员操作' };
      const userId = 'admin_001';

      const mockInstance = {
        id: 'inst_001',
        initiatorId: 'user_001',
        status: 'in_progress',
      };

      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      mockPrismaService.workflowInstance.update.mockResolvedValue({
        ...mockInstance,
        status: 'cancelled',
        cancelReason: cancelDto.cancelReason,
      });

      const result = await service.cancel(instanceId, cancelDto, userId, 'admin');

      expect(result.status).toBe('cancelled');
    });

    it('应该在非发起人且非管理员时抛出 ForbiddenException', async () => {
      const instanceId = 'inst_001';
      const cancelDto = { cancelReason: '测试' };
      const userId = 'user_002';

      const mockInstance = {
        id: 'inst_001',
        initiatorId: 'user_001',
        status: 'in_progress',
      };

      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(mockInstance);

      await expect(service.cancel(instanceId, cancelDto, userId, 'user')).rejects.toThrow(ForbiddenException);
    });

    it('应该在状态为 completed 时抛出 BadRequestException', async () => {
      const instanceId = 'inst_001';
      const cancelDto = { cancelReason: '测试' };
      const userId = 'user_001';

      const mockInstance = {
        id: 'inst_001',
        initiatorId: 'user_001',
        status: 'completed',
      };

      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(mockInstance);

      await expect(service.cancel(instanceId, cancelDto, userId, 'admin')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('应该返回工作流实例详情', async () => {
      const mockInstance = {
        id: 'inst_001',
        templateId: 'tpl_001',
        resourceType: 'document',
        resourceId: 'doc_001',
        resourceTitle: '测试文件',
        status: 'in_progress',
      };

      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(mockInstance);

      const result = await service.findOne('inst_001');

      expect(result).toEqual(mockInstance);
    });

    it('应该在实例不存在时抛出 NotFoundException', async () => {
      mockPrismaService.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non_existent')).rejects.toThrow(NotFoundException);
    });
  });
});
