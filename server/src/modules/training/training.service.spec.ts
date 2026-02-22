import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { TrainingService } from './training.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowInstanceService } from '../workflow/workflow-instance.service';

describe('TrainingService', () => {
  let service: TrainingService;
  let prisma: any;
  let workflowService: any;

  const mockPlan = {
    id: 'plan-1',
    year: 2026,
    title: '2026年度培训计划',
    status: 'draft',
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockProject = {
    id: 'project-1',
    planId: 'plan-1',
    title: 'GMP培训',
    description: null,
    department: 'QA',
    quarter: 2,
    trainerId: 'user-1',
    trainees: ['user-2', 'user-3'],
    scheduledDate: new Date('2026-06-01'),
    documentIds: [],
    passingScore: 60,
    maxAttempts: 3,
    status: 'planned',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  };

  beforeEach(async () => {
    const mockPrisma = {
      trainingPlan: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      trainingProject: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      learningRecord: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      todoTask: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      document: {
        findMany: jest.fn(),
      },
      workflowInstance: {
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockWorkflowService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowInstanceService, useValue: mockWorkflowService },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
    prisma = module.get(PrismaService);
    workflowService = module.get(WorkflowInstanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPlan', () => {
    it('应该成功创建培训计划', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(null);
      prisma.trainingPlan.create.mockResolvedValue(mockPlan);

      const result = await service.createPlan({
        year: 2026,
        title: '2026年度培训计划',
      }, 'user-1');

      expect(result).toEqual(mockPlan);
      expect(prisma.trainingPlan.create).toHaveBeenCalledWith({
        data: {
          year: 2026,
          title: '2026年度培训计划',
          status: 'draft',
          createdBy: 'user-1',
        },
      });
    });

    it('BR-091: 年度唯一性验证 - 同年度计划已存在时应该抛出异常', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);

      await expect(service.createPlan({
        year: 2026,
        title: '另一个计划',
      }, 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('findPlans', () => {
    it('应该返回培训计划列表', async () => {
      prisma.trainingPlan.findMany.mockResolvedValue([mockPlan]);
      prisma.trainingPlan.count.mockResolvedValue(1);

      const result = await service.findPlans({ page: 1, limit: 10 });

      expect(result.items).toEqual([mockPlan]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('应该按年度筛选培训计划', async () => {
      prisma.trainingPlan.findMany.mockResolvedValue([mockPlan]);
      prisma.trainingPlan.count.mockResolvedValue(1);

      const result = await service.findPlans({ year: 2026, page: 1, limit: 10 });

      expect(result.items).toEqual([mockPlan]);
      expect(prisma.trainingPlan.findMany).toHaveBeenCalled();
    });
  });

  describe('findPlanById', () => {
    it('应该返回指定ID的培训计划', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.findPlanById('plan-1');

      expect(result).toEqual(mockPlan);
    });

    it('计划不存在时应该抛出 NotFoundException', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(null);

      await expect(service.findPlanById('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePlan', () => {
    it('应该成功更新草稿状态的培训计划', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      const updatedPlan = { ...mockPlan, title: '更新后的标题' };
      prisma.trainingPlan.update.mockResolvedValue(updatedPlan);

      const result = await service.updatePlan('plan-1', { title: '更新后的标题' });

      expect(result.title).toBe('更新后的标题');
    });

    it('BR-093: 非草稿状态不能修改', async () => {
      const approvedPlan = { ...mockPlan, status: 'approved' };
      prisma.trainingPlan.findUnique.mockResolvedValue(approvedPlan);

      await expect(service.updatePlan('plan-1', { title: '更新' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePlan', () => {
    it('应该成功删除草稿状态的培训计划', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue({ ...mockPlan, projects: [] });
      prisma.trainingPlan.delete.mockResolvedValue(mockPlan);

      const result = await service.deletePlan('plan-1');

      expect(result.message).toBe('删除成功');
    });

    it('BR-093: 非草稿状态不能删除', async () => {
      const approvedPlan = { ...mockPlan, status: 'approved', projects: [] };
      prisma.trainingPlan.findUnique.mockResolvedValue(approvedPlan);

      await expect(service.deletePlan('plan-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('有项目的计划不能删除', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        projects: [{ id: 'project-1' }],
      });

      await expect(service.deletePlan('plan-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('submitPlanForApproval', () => {
    it('BR-092: 应该成功提交审批', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.trainingPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'pending_approval',
      });

      const result = await service.submitPlanForApproval('plan-1');

      expect(result.status).toBe('pending_approval');
    });

    it('非草稿状态不能提交审批', async () => {
      const approvedPlan = { ...mockPlan, status: 'approved' };
      prisma.trainingPlan.findUnique.mockResolvedValue(approvedPlan);

      await expect(service.submitPlanForApproval('plan-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('createProject', () => {
    it('应该成功创建培训项目', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.trainingProject.create.mockResolvedValue(mockProject);
      prisma.learningRecord.findMany.mockResolvedValue([]);
      prisma.learningRecord.createMany.mockResolvedValue({ count: 2 });
      prisma.todoTask.createMany.mockResolvedValue({ count: 1 });

      const result = await service.createProject({
        planId: 'plan-1',
        title: 'GMP培训',
        department: 'QA',
        quarter: 2,
        trainerId: 'user-1',
        trainees: ['user-2', 'user-3'],
        scheduledDate: new Date('2026-06-01'),
        passingScore: 60,
        maxAttempts: 3,
      }, 'user-1');

      expect(result).toEqual(mockProject);
      expect(prisma.trainingProject.create).toHaveBeenCalled();
      expect(prisma.learningRecord.createMany).toHaveBeenCalled();
      expect(prisma.todoTask.createMany).toHaveBeenCalled();
    });

    it('BR-096: 培训计划不存在时应该抛出异常', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(null);

      await expect(service.createProject({
        planId: 'non-existent',
        title: 'GMP培训',
        trainerId: 'user-1',
        trainees: [],
      }, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findProjects', () => {
    it('应该返回培训项目列表', async () => {
      prisma.trainingProject.findMany.mockResolvedValue([mockProject]);
      prisma.trainingProject.count.mockResolvedValue(1);

      const result = await service.findProjects({ page: 1, limit: 10 });

      expect(result.items).toEqual([mockProject]);
      expect(result.total).toBe(1);
    });
  });

  // ==================== TASK-321: Workflow Integration Tests ====================

  describe('submitPlanForApproval - Workflow Integration', () => {
    it('should create WorkflowInstance when submitting for approval', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.trainingPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'pending_approval',
      });
      workflowService.create.mockResolvedValue({
        id: 'workflow-1',
        templateId: 'template-1',
        resourceType: 'training_plan',
        resourceId: 'plan-1',
        status: 'pending',
      });

      await service.submitPlanForApproval('plan-1');

      expect(workflowService.create).toHaveBeenCalledWith(
        {
          templateId: expect.any(String),
          resourceType: 'training_plan',
          resourceId: 'plan-1',
          resourceTitle: mockPlan.title,
        },
        mockPlan.createdBy,
      );
    });
  });

  describe('handleApprovalCompleted', () => {
    it('should update plan status to approved when approval is completed', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.trainingPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'approved',
      });

      await service.handleApprovalCompleted('plan-1');

      expect(prisma.trainingPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: 'approved' },
      });
    });

    it('should throw error if plan does not exist', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(null);

      await expect(service.handleApprovalCompleted('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('handleApprovalRejected', () => {
    it('should reset plan status to draft when approval is rejected', async () => {
      const pendingPlan = { ...mockPlan, status: 'pending_approval' };
      prisma.trainingPlan.findUnique.mockResolvedValue(pendingPlan);
      prisma.trainingPlan.update.mockResolvedValue({
        ...pendingPlan,
        status: 'draft',
      });
      prisma.todoTask.deleteMany.mockResolvedValue({ count: 2 });

      await service.handleApprovalRejected('plan-1');

      expect(prisma.trainingPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: 'draft' },
      });
    });

    it('should delete pending todos when approval is rejected', async () => {
      const pendingPlan = { ...mockPlan, status: 'pending_approval' };
      prisma.trainingPlan.findUnique.mockResolvedValue(pendingPlan);
      prisma.trainingPlan.update.mockResolvedValue(mockPlan);
      prisma.todoTask.deleteMany.mockResolvedValue({ count: 2 });

      await service.handleApprovalRejected('plan-1');

      expect(prisma.todoTask.deleteMany).toHaveBeenCalledWith({
        where: {
          type: 'approval',
          relatedId: 'plan-1',
          status: 'pending',
        },
      });
    });

    it('should throw error if plan does not exist', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(null);

      await expect(service.handleApprovalRejected('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resubmitPlanForApproval', () => {
    it('should delete old workflow instance before creating new one', async () => {
      const mockOldWorkflow = {
        id: 'old-workflow-1',
        resourceId: 'plan-1',
      };

      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.workflowInstance.findFirst.mockResolvedValue(mockOldWorkflow);
      prisma.workflowInstance.delete.mockResolvedValue(mockOldWorkflow);
      prisma.todoTask.deleteMany.mockResolvedValue({ count: 2 });
      prisma.trainingPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'pending_approval',
      });
      workflowService.create.mockResolvedValue({
        id: 'new-workflow-1',
      });

      await service.resubmitPlanForApproval('plan-1');

      expect(prisma.workflowInstance.delete).toHaveBeenCalledWith({
        where: { id: mockOldWorkflow.id },
      });
    });

    it('should delete old pending todos before creating new workflow', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.workflowInstance.findFirst.mockResolvedValue(null);
      prisma.todoTask.deleteMany.mockResolvedValue({ count: 2 });
      prisma.trainingPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'pending_approval',
      });
      workflowService.create.mockResolvedValue({
        id: 'new-workflow-1',
      });

      await service.resubmitPlanForApproval('plan-1');

      expect(prisma.todoTask.deleteMany).toHaveBeenCalledWith({
        where: {
          type: 'approval',
          relatedId: 'plan-1',
          status: 'pending',
        },
      });
    });

    it('should create new workflow instance after cleanup', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.workflowInstance.findFirst.mockResolvedValue(null);
      prisma.todoTask.deleteMany.mockResolvedValue({ count: 0 });
      prisma.trainingPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'pending_approval',
      });
      workflowService.create.mockResolvedValue({
        id: 'new-workflow-1',
      });

      await service.resubmitPlanForApproval('plan-1');

      expect(workflowService.create).toHaveBeenCalledWith(
        {
          templateId: expect.any(String),
          resourceType: 'training_plan',
          resourceId: 'plan-1',
          resourceTitle: mockPlan.title,
        },
        mockPlan.createdBy,
      );
    });

    it('should throw error if plan does not exist', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(null);

      await expect(service.resubmitPlanForApproval('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
