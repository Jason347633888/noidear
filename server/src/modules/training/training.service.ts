import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowInstanceService } from '../workflow/workflow-instance.service';
import { CreateTrainingPlanDto } from './dto/create-plan.dto';
import { UpdateTrainingPlanDto } from './dto/update-plan.dto';
import { QueryTrainingPlanDto } from './dto/query-plan.dto';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowInstanceService,
  ) {}

  // ==================== 培训计划管理 ====================

  /**
   * 创建年度培训计划
   * BR-091: 年度唯一性校验
   */
  async createPlan(dto: CreateTrainingPlanDto, userId: string) {
    await this.validatePlanYearUniqueness(dto.year);

    return this.prisma.trainingPlan.create({
      data: {
        year: dto.year,
        title: dto.title,
        status: 'draft',
        createdBy: userId,
      },
    });
  }

  /**
   * 查询培训计划列表
   */
  async findPlans(dto: QueryTrainingPlanDto) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;
    const where = this.buildPlanQueryWhere(dto);

    const [items, total] = await Promise.all([
      this.prisma.trainingPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { year: 'desc' },
        include: this.getPlanInclude(),
      }),
      this.prisma.trainingPlan.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 查询培训计划详情
   */
  async findPlanById(id: string) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id },
      include: this.getPlanDetailInclude(),
    });

    if (!plan) {
      throw new NotFoundException('培训计划不存在');
    }

    return plan;
  }

  /**
   * 更新培训计划
   * BR-093: 培训计划修改规则（draft 可直接修改，approved 需重新审批）
   */
  async updatePlan(id: string, dto: UpdateTrainingPlanDto) {
    const plan = await this.getPlanById(id);
    this.validatePlanIsDraft(plan, '修改');

    return this.prisma.trainingPlan.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除培训计划
   * BR-093: 只有 draft 状态可以删除
   */
  async deletePlan(id: string) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id },
      include: { projects: true },
    });

    if (!plan) {
      throw new NotFoundException('培训计划不存在');
    }

    this.validatePlanIsDraft(plan, '删除');

    if (plan.projects.length > 0) {
      throw new BadRequestException('该培训计划下有培训项目，无法删除');
    }

    await this.prisma.trainingPlan.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 提交审批
   * BR-092: 培训计划审批规则
   * TASK-321: 集成工作流引擎
   */
  async submitPlanForApproval(id: string) {
    const plan = await this.getPlanById(id);

    if (plan.status !== 'draft') {
      throw new BadRequestException('只有草稿状态的培训计划可以提交审批');
    }

    // 创建工作流实例
    await this.workflowService.create(
      {
        templateId: 'training-plan-approval',
        resourceType: 'training_plan',
        resourceId: id,
        resourceTitle: plan.title,
      },
      plan.createdBy,
    );

    return this.prisma.trainingPlan.update({
      where: { id },
      data: { status: 'pending_approval' },
    });
  }

  /**
   * 处理审批完成
   * TASK-321: 工作流审批完成回调
   */
  async handleApprovalCompleted(id: string) {
    const plan = await this.getPlanById(id);

    return this.prisma.trainingPlan.update({
      where: { id },
      data: { status: 'approved' },
    });
  }

  /**
   * 处理审批驳回
   * TASK-321: 工作流审批驳回回调
   */
  async handleApprovalRejected(id: string) {
    const plan = await this.getPlanById(id);

    // 删除待办任务
    await this.prisma.todoTask.deleteMany({
      where: {
        type: 'approval',
        relatedId: id,
        status: 'pending',
      },
    });

    return this.prisma.trainingPlan.update({
      where: { id },
      data: { status: 'draft' },
    });
  }

  /**
   * 重新提交审批
   * TASK-321: 删除旧工作流和待办，创建新工作流
   */
  async resubmitPlanForApproval(id: string) {
    const plan = await this.getPlanById(id);

    // 查找并删除旧的工作流实例
    const oldWorkflow = await this.prisma.workflowInstance.findFirst({
      where: {
        resourceType: 'training_plan',
        resourceId: id,
      },
    });

    if (oldWorkflow) {
      await this.prisma.workflowInstance.delete({
        where: { id: oldWorkflow.id },
      });
    }

    // 删除旧的待办任务
    await this.prisma.todoTask.deleteMany({
      where: {
        type: 'approval',
        relatedId: id,
        status: 'pending',
      },
    });

    // 创建新的工作流实例
    await this.workflowService.create(
      {
        templateId: 'training-plan-approval',
        resourceType: 'training_plan',
        resourceId: id,
        resourceTitle: plan.title,
      },
      plan.createdBy,
    );

    return this.prisma.trainingPlan.update({
      where: { id },
      data: { status: 'pending_approval' },
    });
  }

  // ==================== Private Helper Methods ====================

  private async validatePlanYearUniqueness(year: number) {
    const existing = await this.prisma.trainingPlan.findUnique({
      where: { year },
    });

    if (existing) {
      throw new ConflictException(`${year}年度培训计划已存在`);
    }
  }

  private async getPlanById(id: string) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('培训计划不存在');
    }

    return plan;
  }

  private validatePlanIsDraft(plan: any, action: string) {
    if (plan.status !== 'draft') {
      throw new BadRequestException(`只有草稿状态的培训计划可以${action}`);
    }
  }

  private buildPlanQueryWhere(dto: QueryTrainingPlanDto) {
    const where: any = {};
    if (dto.year) where.year = dto.year;
    if (dto.status) where.status = dto.status;
    return where;
  }

  private getPlanInclude() {
    return {
      projects: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    };
  }

  private getPlanDetailInclude() {
    return {
      projects: {
        include: {
          learningRecords: {
            select: {
              userId: true,
              passed: true,
              examScore: true,
            },
          },
        },
      },
    };
  }

  // ==================== 培训项目管理 ====================

  /**
   * 创建培训项目
   * BR-096: 培训项目状态流转
   * BR-097: 培训资料引用规则
   * BR-099: 培训学员限制
   */
  async createProject(dto: any, userId: string) {
    // 验证培训计划存在
    await this.getPlanById(dto.planId);

    // BR-097: 验证培训资料引用（只能引用已发布文档）
    if (dto.documentIds && dto.documentIds.length > 0) {
      await this.validateDocuments(dto.documentIds);
    }

    // BR-099: 学员数量限制（1-100人）已在 DTO 层面校验

    // 创建培训项目
    const project = await this.prisma.trainingProject.create({
      data: {
        planId: dto.planId,
        title: dto.title,
        description: dto.description,
        department: dto.department,
        quarter: dto.quarter,
        trainerId: dto.trainerId,
        trainees: dto.trainees,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        documentIds: dto.documentIds || [],
        passingScore: dto.passingScore || 60,
        maxAttempts: dto.maxAttempts || 3,
        status: 'planned',
      },
    });

    // 为每个学员创建学习记录
    await this.createLearningRecordsForTrainees(project.id, dto.trainees);

    // BR-108: 自动生成待办任务
    await this.createTodoTasksForProject(project);

    return project;
  }

  /**
   * 查询培训项目列表
   */
  async findProjects(dto: any) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;
    const where = this.buildProjectQueryWhere(dto);

    const [items, total] = await Promise.all([
      this.prisma.trainingProject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: {
            select: { year: true, title: true },
          },
          learningRecords: {
            select: {
              id: true,
              userId: true,
              passed: true,
              examScore: true,
            },
          },
        },
      }),
      this.prisma.trainingProject.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 查询培训项目详情
   */
  async findProjectById(id: string) {
    const project = await this.prisma.trainingProject.findUnique({
      where: { id },
      include: {
        plan: true,
        questions: {
          orderBy: { order: 'asc' },
        },
        learningRecords: {
          include: {
            examRecords: {
              orderBy: { submittedAt: 'desc' },
            },
          },
        },
        archive: true,
      },
    });

    if (!project) {
      throw new NotFoundException('培训项目不存在');
    }

    return project;
  }

  /**
   * 更新培训项目
   * BR-096: planned 可修改，ongoing 只能修改学员
   */
  async updateProject(id: string, dto: any) {
    const project = await this.getProjectById(id);

    // BR-096: 状态校验
    if (project.status === 'completed' || project.status === 'cancelled') {
      throw new BadRequestException('已完成或已取消的培训项目无法修改');
    }

    // ongoing 状态只能修改学员
    if (project.status === 'ongoing' && Object.keys(dto).some(key => key !== 'trainees')) {
      throw new BadRequestException('进行中的培训项目只能修改学员名单');
    }

    // BR-097: 验证培训资料引用
    if (dto.documentIds && dto.documentIds.length > 0) {
      await this.validateDocuments(dto.documentIds);
    }

    // 更新培训项目
    const updated = await this.prisma.trainingProject.update({
      where: { id },
      data: {
        ...dto,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      },
    });

    // 如果修改了学员，需要同步学习记录
    if (dto.trainees) {
      await this.syncLearningRecords(id, dto.trainees);
    }

    return updated;
  }

  /**
   * 删除培训项目
   * BR-096: planned 可删除，其他状态只能取消
   */
  async deleteProject(id: string) {
    const project = await this.getProjectById(id);

    if (project.status !== 'planned') {
      throw new BadRequestException('只有计划中的培训项目可以删除，其他状态请使用取消功能');
    }

    // 删除相关数据
    await this.prisma.$transaction([
      // 删除待办任务
      this.prisma.todoTask.deleteMany({
        where: {
          type: { in: ['training_organize', 'training_attend'] },
          relatedId: id,
        },
      }),
      // 删除学习记录
      this.prisma.learningRecord.deleteMany({
        where: { projectId: id },
      }),
      // 删除培训项目
      this.prisma.trainingProject.delete({
        where: { id },
      }),
    ]);

    return { message: '删除成功' };
  }

  /**
   * 添加学员
   * BR-099: 学员数量限制
   */
  async addTrainees(id: string, userIds: string[]) {
    const project = await this.getProjectById(id);

    // 合并现有学员和新学员
    const newTrainees = Array.from(new Set([...project.trainees, ...userIds]));

    // BR-099: 学员数量限制
    if (newTrainees.length > 100) {
      throw new BadRequestException('学员数量不能超过100人');
    }

    // 更新培训项目
    const updated = await this.prisma.trainingProject.update({
      where: { id },
      data: { trainees: newTrainees },
    });

    // 为新学员创建学习记录
    await this.createLearningRecordsForTrainees(id, userIds);

    // 为新学员创建待办任务
    await this.createTodoTasksForNewTrainees(project, userIds);

    return updated;
  }

  /**
   * 移除学员
   */
  async removeTrainee(id: string, userId: string) {
    const project = await this.getProjectById(id);

    if (!project.trainees.includes(userId)) {
      throw new BadRequestException('该用户不在学员列表中');
    }

    // 更新培训项目
    const updated = await this.prisma.trainingProject.update({
      where: { id },
      data: {
        trainees: project.trainees.filter(t => t !== userId),
      },
    });

    // 删除学习记录
    await this.prisma.learningRecord.deleteMany({
      where: { projectId: id, userId },
    });

    // 删除待办任务
    await this.prisma.todoTask.deleteMany({
      where: {
        type: 'training_attend',
        relatedId: id,
        userId,
      },
    });

    return updated;
  }

  /**
   * 更新培训项目状态
   * BR-096: 培训项目状态流转
   */
  async updateProjectStatus(id: string, status: string) {
    const project = await this.getProjectById(id);

    // 状态流转校验
    this.validateProjectStatusTransition(project.status, status);

    const data: any = { status };

    // 如果完成，记录完成时间
    if (status === 'completed') {
      data.completedAt = new Date();
    }

    return this.prisma.trainingProject.update({
      where: { id },
      data,
    });
  }

  // ==================== Private Helper Methods (Projects) ====================

  private async getProjectById(id: string) {
    const project = await this.prisma.trainingProject.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('培训项目不存在');
    }

    return project;
  }

  private buildProjectQueryWhere(dto: any) {
    const where: any = {};
    if (dto.planId) where.planId = dto.planId;
    if (dto.department) where.department = dto.department;
    if (dto.status) where.status = dto.status;
    if (dto.quarter) where.quarter = dto.quarter;
    return where;
  }

  private async validateDocuments(documentIds: string[]) {
    // BR-097: 只能引用已发布文档
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: documentIds },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (documents.length !== documentIds.length) {
      throw new BadRequestException('部分培训资料不存在');
    }

    const unpublishedDocs = documents.filter(doc => doc.status !== 'published');
    if (unpublishedDocs.length > 0) {
      throw new BadRequestException('只能引用已发布的文档作为培训资料');
    }
  }

  private async createLearningRecordsForTrainees(projectId: string, trainees: string[]) {
    const existingRecords = await this.prisma.learningRecord.findMany({
      where: { projectId },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingRecords.map(r => r.userId));
    const newTrainees = trainees.filter(userId => !existingUserIds.has(userId));

    if (newTrainees.length > 0) {
      await this.prisma.learningRecord.createMany({
        data: newTrainees.map(userId => ({
          projectId,
          userId,
          examScore: 0,
          attempts: 0,
          passed: false,
        })),
      });
    }
  }

  private async syncLearningRecords(projectId: string, newTrainees: string[]) {
    // 获取现有学习记录
    const existingRecords = await this.prisma.learningRecord.findMany({
      where: { projectId },
    });

    const existingUserIds = new Set(existingRecords.map(r => r.userId));
    const newTraineesSet = new Set(newTrainees);

    // 删除不在新列表中的学习记录
    const toDelete = existingRecords.filter(r => !newTraineesSet.has(r.userId));
    if (toDelete.length > 0) {
      await this.prisma.learningRecord.deleteMany({
        where: {
          id: { in: toDelete.map(r => r.id) },
        },
      });
    }

    // 创建新学员的学习记录
    await this.createLearningRecordsForTrainees(projectId, newTrainees);
  }

  private async createTodoTasksForProject(project: any) {
    const tasks: any[] = [];

    // BR-108: 为培训讲师创建待办任务
    tasks.push({
      userId: project.trainerId,
      type: 'training_organize' as any,
      relatedId: project.id,
      title: `组织培训：${project.title}`,
      description: `您需要组织并实施培训项目"${project.title}"`,
      status: 'pending' as any,
      priority: 'normal' as any,
      dueDate: project.scheduledDate,
    });

    // BR-108: 为学员创建待办任务
    for (const traineeId of project.trainees) {
      tasks.push({
        userId: traineeId,
        type: 'training_attend' as any,
        relatedId: project.id,
        title: `参加培训：${project.title}`,
        description: `您需要参加培训并通过考试`,
        status: 'pending' as any,
        priority: 'normal' as any,
        dueDate: project.scheduledDate,
      });
    }

    await this.prisma.todoTask.createMany({ data: tasks });
  }

  private async createTodoTasksForNewTrainees(project: any, userIds: string[]) {
    const tasks: any[] = userIds.map(userId => ({
      userId,
      type: 'training_attend' as any,
      relatedId: project.id,
      title: `参加培训：${project.title}`,
      description: `您需要参加培训并通过考试`,
      status: 'pending' as any,
      priority: 'normal' as any,
      dueDate: project.scheduledDate,
    }));

    await this.prisma.todoTask.createMany({ data: tasks });
  }

  private validateProjectStatusTransition(currentStatus: string, newStatus: string) {
    const validTransitions: Record<string, string[]> = {
      planned: ['ongoing', 'cancelled'],
      ongoing: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`无法从 ${currentStatus} 状态转换到 ${newStatus} 状态`);
    }
  }
}
