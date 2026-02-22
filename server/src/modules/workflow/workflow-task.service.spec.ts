import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowTaskService } from './workflow-task.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('WorkflowTaskService', () => {
  let service: WorkflowTaskService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    workflowTask: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    workflowInstance: {
      update: jest.fn(),
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
        WorkflowTaskService,
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

    service = module.get<WorkflowTaskService>(WorkflowTaskService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('approve', () => {
    it('应该成功审批通过并创建下一步任务', async () => {
      const taskId = 'task_001';
      const approveDto = { comment: '同意' };
      const userId = 'user_001';

      const mockTask = {
        id: 'task_001',
        instanceId: 'inst_001',
        stepIndex: 0,
        assigneeId: 'user_001',
        status: 'pending',
        instance: {
          initiatorId: 'user_002',
          template: {
            steps: [
              { index: 0, name: '步骤1', assigneeRole: 'manager', timeoutHours: 24 },
              { index: 1, name: '步骤2', assigneeRole: 'director', timeoutHours: 48 },
            ],
          },
        },
      };

      const mockAssignee = {
        id: 'user_003',
        role: 'director',
      };

      mockPrismaService.workflowTask.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.user.findUnique.mockResolvedValue({ departmentId: 'dept_001' });
      mockPrismaService.user.findFirst.mockResolvedValue(mockAssignee);

      const result = await service.approve(taskId, approveDto, userId);

      expect(result.success).toBe(true);
      expect(mockPrismaService.workflowTask.update).toHaveBeenCalled();
      expect(mockPrismaService.workflowTask.create).toHaveBeenCalled();
    });

    it('应该在最后一步审批后完成工作流', async () => {
      const taskId = 'task_001';
      const approveDto = { comment: '同意' };
      const userId = 'user_001';

      const mockTask = {
        id: 'task_001',
        instanceId: 'inst_001',
        stepIndex: 1,
        assigneeId: 'user_001',
        status: 'pending',
        instance: {
          initiatorId: 'user_002',
          template: {
            steps: [
              { index: 0, name: '步骤1' },
              { index: 1, name: '步骤2' },
            ],
          },
        },
      };

      mockPrismaService.workflowTask.findUnique.mockResolvedValue(mockTask);

      const result = await service.approve(taskId, approveDto, userId);

      expect(result.success).toBe(true);
      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst_001' },
        data: { status: 'completed', currentStep: 2 },
      });
    });

    it('应该在非指派人审批时抛出 ForbiddenException', async () => {
      const taskId = 'task_001';
      const approveDto = { comment: '同意' };
      const userId = 'user_002';

      const mockTask = {
        id: 'task_001',
        assigneeId: 'user_001',
        status: 'pending',
        instance: { template: { steps: [] } },
      };

      mockPrismaService.workflowTask.findUnique.mockResolvedValue(mockTask);

      await expect(service.approve(taskId, approveDto, userId)).rejects.toThrow(ForbiddenException);
    });

    it('应该在任务非 pending 状态时抛出 BadRequestException', async () => {
      const taskId = 'task_001';
      const approveDto = { comment: '同意' };
      const userId = 'user_001';

      const mockTask = {
        id: 'task_001',
        assigneeId: 'user_001',
        status: 'approved',
        instance: { template: { steps: [] } },
      };

      mockPrismaService.workflowTask.findUnique.mockResolvedValue(mockTask);

      await expect(service.approve(taskId, approveDto, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('应该成功驳回任务并更新工作流状态', async () => {
      const taskId = 'task_001';
      const rejectDto = { comment: '不符合要求' };
      const userId = 'user_001';

      const mockTask = {
        id: 'task_001',
        instanceId: 'inst_001',
        assigneeId: 'user_001',
        status: 'pending',
        instance: { template: { steps: [] } },
      };

      mockPrismaService.workflowTask.findUnique.mockResolvedValue(mockTask);

      const result = await service.reject(taskId, rejectDto, userId);

      expect(result.success).toBe(true);
      expect(mockPrismaService.workflowTask.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          status: 'rejected',
          comment: rejectDto.comment,
          completedAt: expect.any(Date),
        },
      });
      expect(mockPrismaService.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst_001' },
        data: { status: 'rejected' },
      });
    });
  });

  describe('findMyTasks', () => {
    it('应该返回我的待审批任务列表', async () => {
      const query = { status: 'pending', page: 1, limit: 10 };
      const userId = 'user_001';

      const mockTasks = [
        {
          id: 'task_001',
          stepName: '部门主管审批',
          status: 'pending',
          dueAt: new Date(),
          instance: {
            id: 'inst_001',
            resourceType: 'document',
            resourceTitle: '测试文档',
            initiator: { id: 'user_002', username: 'initiator', name: '发起人' },
          },
        },
      ];

      mockPrismaService.workflowTask.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.workflowTask.count.mockResolvedValue(1);

      const result = await service.findMyTasks(query, userId);

      expect(result.data).toEqual(mockTasks);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('应该支持按资源类型筛选', async () => {
      const query = { resourceType: 'document', page: 1, limit: 10 };
      const userId = 'user_001';

      mockPrismaService.workflowTask.findMany.mockResolvedValue([]);
      mockPrismaService.workflowTask.count.mockResolvedValue(0);

      await service.findMyTasks(query, userId);

      expect(mockPrismaService.workflowTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId: userId,
            instance: { resourceType: 'document' },
          }),
        }),
      );
    });
  });
});
