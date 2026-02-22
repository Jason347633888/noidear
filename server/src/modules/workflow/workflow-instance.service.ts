import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateWorkflowInstanceDto } from './dto/create-workflow-instance.dto';
import { CancelWorkflowInstanceDto } from './dto/cancel-workflow-instance.dto';

@Injectable()
export class WorkflowInstanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 创建工作流实例
   * BR-354: 工作流模板规则
   * BR-355: 工作流启动规则
   */
  async create(createDto: CreateWorkflowInstanceDto, initiatorId: string) {
    const template = await this.validateTemplate(createDto.templateId);

    return await this.prisma.$transaction(async (prisma) => {
      const instance = await this.createInstance(prisma, createDto, template.id, initiatorId);
      await this.createFirstTask(prisma, instance, template, initiatorId);
      return instance;
    });
  }

  /**
   * 取消工作流
   * BR-356: 工作流取消规则
   */
  async cancel(
    instanceId: string,
    cancelDto: CancelWorkflowInstanceDto,
    userId: string,
    userRole: string,
  ) {
    const instance = await this.findInstanceOrFail(instanceId);
    this.validateCancelPermission(instance, userId, userRole);
    this.validateCancelStatus(instance);

    return await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'cancelled',
        cancelReason: cancelDto.cancelReason,
      },
    });
  }

  /**
   * 查询工作流实例详情
   */
  async findOne(id: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        template: true,
        initiator: {
          select: { id: true, username: true, name: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, username: true, name: true },
            },
          },
          orderBy: { stepIndex: 'asc' },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException(`工作流实例 ${id} 不存在`);
    }

    return instance;
  }

  /**
   * P1-14: 查询工作流实例列表
   */
  async findAll(query: {
    status?: string;
    resourceType?: string;
    initiatorId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, resourceType, initiatorId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (resourceType && resourceType !== 'all') {
      where.resourceType = resourceType;
    }

    if (initiatorId) {
      where.initiatorId = initiatorId;
    }

    const [data, total] = await Promise.all([
      this.prisma.workflowInstance.findMany({
        where,
        skip,
        take: limit,
        include: {
          template: { select: { id: true, code: true, name: true } },
          initiator: { select: { id: true, username: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflowInstance.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * P2-7: 工作流统计信息
   * 返回各状态数量、平均处理时间等统计数据
   */
  async getStatistics() {
    const [statusCounts, totalInstances] = await Promise.all([
      this.prisma.workflowInstance.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.workflowInstance.count(),
    ]);

    // 计算已完成工作流的平均处理时间
    const completedInstances = await this.prisma.workflowInstance.findMany({
      where: { status: 'completed' },
      select: { createdAt: true, updatedAt: true },
    });

    let avgProcessingTimeHours = 0;
    if (completedInstances.length > 0) {
      const totalMs = completedInstances.reduce((sum, inst) => {
        return sum + (inst.updatedAt.getTime() - inst.createdAt.getTime());
      }, 0);
      avgProcessingTimeHours = Math.round(totalMs / completedInstances.length / 3600000 * 10) / 10;
    }

    // 待处理任务数
    const pendingTasks = await this.prisma.workflowTask.count({
      where: { status: 'pending' },
    });

    // 超时任务数
    const overdueTasks = await this.prisma.workflowTask.count({
      where: {
        status: 'pending',
        dueAt: { lt: new Date() },
      },
    });

    const statusMap: Record<string, number> = {};
    for (const item of statusCounts) {
      statusMap[item.status] = item._count.id;
    }

    return {
      total: totalInstances,
      byStatus: {
        pending: statusMap['pending'] || 0,
        in_progress: statusMap['in_progress'] || 0,
        completed: statusMap['completed'] || 0,
        cancelled: statusMap['cancelled'] || 0,
        rejected: statusMap['rejected'] || 0,
      },
      avgProcessingTimeHours,
      pendingTasks,
      overdueTasks,
    };
  }

  /**
   * 验证模板存在且可用
   * 支持通过 ID 或 code 查找模板
   */
  private async validateTemplate(templateIdOrCode: string) {
    // Try to find by ID first, then by code
    let template = await this.prisma.workflowTemplate.findUnique({
      where: { id: templateIdOrCode },
    });

    if (!template) {
      template = await this.prisma.workflowTemplate.findUnique({
        where: { code: templateIdOrCode },
      });
    }

    if (!template) {
      throw new NotFoundException(`工作流模板 ${templateIdOrCode} 不存在`);
    }

    if (template.status !== 'active') {
      throw new BadRequestException('工作流模板已停用，无法启动');
    }

    return template;
  }

  /**
   * 创建工作流实例记录
   */
  private async createInstance(prisma: any, createDto: CreateWorkflowInstanceDto, templateId: string, initiatorId: string) {
    return await prisma.workflowInstance.create({
      data: {
        templateId: templateId,
        resourceType: createDto.resourceType,
        resourceId: createDto.resourceId,
        resourceTitle: createDto.resourceTitle,
        initiatorId,
        status: 'pending',
        currentStep: 0,
      },
    });
  }

  /**
   * 创建第一步审批任务
   */
  private async createFirstTask(prisma: any, instance: any, template: any, initiatorId: string) {
    const steps = template.steps as any[];
    if (!steps || steps.length === 0) {
      return;
    }

    const firstStep = steps[0];
    const assignee = await this.findAssigneeByRole(firstStep.assigneeRole, initiatorId);

    if (!assignee) {
      return;
    }

    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (firstStep.timeoutHours || 24));

    await prisma.workflowTask.create({
      data: {
        instanceId: instance.id,
        stepIndex: 0,
        stepName: firstStep.name,
        assigneeId: assignee.id,
        status: 'pending',
        dueAt,
      },
    });

    await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { status: 'in_progress' },
    });

    // P1-15: 发送审批通知给第一个审批人
    try {
      await this.notificationService.create({
        userId: assignee.id,
        type: 'workflow_approval',
        title: '您有新的审批任务',
        content: `工作流 [${instance.resourceTitle}] 的审批任务 [${firstStep.name}] 已分配给您`,
      });
    } catch {
      // 通知发送失败不影响主流程
    }
  }

  /**
   * 查找实例或抛出异常
   */
  private async findInstanceOrFail(instanceId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException(`工作流实例 ${instanceId} 不存在`);
    }

    return instance;
  }

  /**
   * 验证取消权限
   */
  private validateCancelPermission(instance: any, userId: string, userRole: string) {
    if (instance.initiatorId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('仅工作流发起人或管理员可取消工作流');
    }
  }

  /**
   * 验证可取消状态
   */
  private validateCancelStatus(instance: any) {
    if (instance.status !== 'pending' && instance.status !== 'in_progress') {
      throw new BadRequestException(`工作流状态为 ${instance.status}，无法取消`);
    }
  }

  /**
   * 根据角色查找审批人
   */
  private async findAssigneeByRole(roleName: string, initiatorId: string) {
    const initiator = await this.prisma.user.findUnique({
      where: { id: initiatorId },
      select: { roleId: true, departmentId: true },
    });

    if (!initiator) {
      return null;
    }

    return await this.prisma.user.findFirst({
      where: {
        departmentId: initiator.departmentId,
        role: roleName,
        status: 'active',
      },
    });
  }
}
