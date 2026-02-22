import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ApproveTaskDto } from './dto/approve-task.dto';
import { RejectTaskDto } from './dto/reject-task.dto';
import { QueryMyTasksDto } from './dto/query-my-tasks.dto';
import { ConditionParser } from './condition-parser';

@Injectable()
export class WorkflowTaskService {
  private readonly logger = new Logger(WorkflowTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 审批通过
   * BR-357: 串行/并行审批规则
   */
  async approve(taskId: string, approveDto: ApproveTaskDto, userId: string) {
    const task = await this.findTaskOrFail(taskId);
    this.validateAssignee(task, userId);
    this.validatePendingStatus(task);

    const result = await this.prisma.$transaction(async (prisma) => {
      await this.updateTaskStatus(prisma, taskId, 'approved', approveDto.comment);
      await this.processNextStep(prisma, task);
      return { success: true, message: '审批通过' };
    });

    // P1-15: 审批通过通知发起人
    try {
      await this.notificationService.create({
        userId: task.instance.initiatorId,
        type: 'workflow_approved',
        title: '审批任务已通过',
        content: `工作流 [${task.instance.resourceTitle}] 的步骤 [${task.stepName}] 已审批通过`,
      });
    } catch {
      // 通知失败不影响主流程
    }

    return result;
  }

  /**
   * 审批驳回
   * BR-357: 串行/并行审批规则
   */
  async reject(taskId: string, rejectDto: RejectTaskDto, userId: string) {
    const task = await this.findTaskOrFail(taskId);
    this.validateAssignee(task, userId);
    this.validatePendingStatus(task);

    const result = await this.prisma.$transaction(async (prisma) => {
      await this.updateTaskStatus(prisma, taskId, 'rejected', rejectDto.comment);
      await prisma.workflowInstance.update({
        where: { id: task.instanceId },
        data: { status: 'rejected' },
      });
      return { success: true, message: '已驳回' };
    });

    // P1-15: 审批驳回通知发起人
    try {
      await this.notificationService.create({
        userId: task.instance.initiatorId,
        type: 'workflow_rejected',
        title: '审批任务被驳回',
        content: `工作流 [${task.instance.resourceTitle}] 的步骤 [${task.stepName}] 被驳回: ${rejectDto.comment || '无'}`,
      });
    } catch {
      // 通知失败不影响主流程
    }

    return result;
  }

  /**
   * 查询我的待审批任务
   */
  async findMyTasks(query: QueryMyTasksDto, userId: string) {
    const { status = 'pending', resourceType, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { assigneeId: userId };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (resourceType && resourceType !== 'all') {
      where.instance = { resourceType };
    }

    const [data, total] = await Promise.all([
      this.prisma.workflowTask.findMany({
        where,
        skip,
        take: limit,
        include: {
          instance: {
            select: {
              id: true,
              resourceType: true,
              resourceId: true,
              resourceTitle: true,
              initiator: { select: { id: true, username: true, name: true } },
            },
          },
        },
        orderBy: { dueAt: 'asc' },
      }),
      this.prisma.workflowTask.count({ where }),
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
   * P0-2: 审批超时升级定时任务
   * 每 10 分钟检查超时任务并升级给上级
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleTimeoutEscalation() {
    try {
      const now = new Date();

      const overdueTasks = await this.prisma.workflowTask.findMany({
        where: {
          status: 'pending',
          dueAt: { lt: now },
          escalatedTo: null,
        },
        include: {
          assignee: {
            select: { id: true, superiorId: true, name: true },
          },
          instance: {
            select: { id: true, resourceTitle: true },
          },
        },
      });

      for (const task of overdueTasks) {
        const superiorId = task.assignee?.superiorId;
        if (!superiorId) {
          this.logger.warn(`任务 ${task.id} 超时但审批人无上级，无法升级`);
          continue;
        }

        await this.prisma.workflowTask.update({
          where: { id: task.id },
          data: {
            escalatedTo: superiorId,
            assigneeId: superiorId,
            dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        });

        this.logger.log(
          `任务 ${task.id} (${task.instance?.resourceTitle}) 已超时升级: ${task.assignee?.name} -> 上级 ${superiorId}`,
        );
      }

      if (overdueTasks.length > 0) {
        this.logger.log(`超时升级检查完成，处理 ${overdueTasks.length} 个超时任务`);
      }
    } catch (error) {
      this.logger.error(`超时升级检查失败: ${error.message}`, error.stack);
    }
  }

  private async findTaskOrFail(taskId: string) {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
      include: {
        instance: { include: { template: true } },
      },
    });

    if (!task) {
      throw new NotFoundException(`任务 ${taskId} 不存在`);
    }

    return task;
  }

  private validateAssignee(task: any, userId: string) {
    if (task.assigneeId !== userId) {
      throw new ForbiddenException('仅任务指派人可审批');
    }
  }

  private validatePendingStatus(task: any) {
    if (task.status !== 'pending') {
      throw new BadRequestException(`任务状态为 ${task.status}，无法审批`);
    }
  }

  private async updateTaskStatus(prisma: any, taskId: string, status: string, comment: string) {
    await prisma.workflowTask.update({
      where: { id: taskId },
      data: {
        status,
        comment,
        completedAt: new Date(),
      },
    });
  }

  /**
   * P0-1: 支持串行 + 并行（会签）审批
   * TASK-381: 集成 ConditionParser 支持条件分支，支持 ccUsers 抄送
   * step.type: 'serial' | 'parallel'
   * step.condition: 条件表达式（如 "amount > 10000"），满足才执行此步骤
   * step.ccUsers: 抄送用户 ID 列表
   */
  private async processNextStep(prisma: any, task: any) {
    const template = task.instance.template;
    const steps = template.steps as any[];
    const currentStep = steps[task.stepIndex];

    // 并行审批（会签）: 检查同步骤的所有任务是否全部完成
    if (currentStep?.type === 'parallel') {
      const allTasksForStep = await prisma.workflowTask.findMany({
        where: {
          instanceId: task.instanceId,
          stepIndex: task.stepIndex,
        },
      });

      const allApproved = allTasksForStep.every(
        (t: any) => t.status === 'approved',
      );

      if (!allApproved) {
        return;
      }
    }

    // TASK-381: 发送抄送通知
    await this.sendCcNotifications(currentStep, task);

    // TASK-381: 条件分支 - 找到下一个满足条件的步骤
    const nextStepIndex = await this.resolveNextStepIndex(
      steps,
      task.stepIndex,
      task.instanceId,
    );

    if (nextStepIndex === null || nextStepIndex >= steps.length) {
      await prisma.workflowInstance.update({
        where: { id: task.instanceId },
        data: { status: 'completed', currentStep: steps.length },
      });
      return;
    }

    const nextStep = steps[nextStepIndex];

    // 并行审批（会签）: 为所有审批人创建任务
    if (nextStep.type === 'parallel' && Array.isArray(nextStep.assigneeRoles)) {
      const assignees = await this.findAssigneesByRoles(
        nextStep.assigneeRoles,
        task.instance.initiatorId,
      );

      const dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + (nextStep.timeoutHours || 24));

      for (const assignee of assignees) {
        await prisma.workflowTask.create({
          data: {
            instanceId: task.instanceId,
            stepIndex: nextStepIndex,
            stepName: nextStep.name,
            assigneeId: assignee.id,
            status: 'pending',
            dueAt,
          },
        });
      }
    } else {
      // 串行审批: 单个审批人
      const assignee = await this.findAssigneeByRole(
        nextStep.assigneeRole,
        task.instance.initiatorId,
      );

      if (!assignee) {
        return;
      }

      const dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + (nextStep.timeoutHours || 24));

      await prisma.workflowTask.create({
        data: {
          instanceId: task.instanceId,
          stepIndex: nextStepIndex,
          stepName: nextStep.name,
          assigneeId: assignee.id,
          status: 'pending',
          dueAt,
        },
      });
    }

    await prisma.workflowInstance.update({
      where: { id: task.instanceId },
      data: { currentStep: nextStepIndex },
    });
  }

  /**
   * TASK-381: 通过 ConditionParser 确定下一个应执行的步骤索引
   * 若步骤无条件则直接返回 stepIndex+1；否则跳过条件不满足的步骤
   */
  private async resolveNextStepIndex(
    steps: any[],
    currentStepIndex: number,
    instanceId: string,
  ): Promise<number | null> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      select: { resourceId: true, resourceType: true },
    });

    const context: Record<string, unknown> = {
      resourceId: instance?.resourceId,
      resourceType: instance?.resourceType,
    };

    for (let i = currentStepIndex + 1; i < steps.length; i++) {
      const step = steps[i];
      if (!step.condition) {
        return i;
      }
      try {
        const matches = ConditionParser.evaluate(step.condition, context);
        if (matches) return i;
      } catch (error) {
        this.logger.error(
          `条件解析失败 (step ${i}): "${step.condition}" - ${error.message}`,
        );
        return i;
      }
    }

    return null;
  }

  /**
   * TASK-381: 向当前步骤的抄送用户发送通知
   */
  private async sendCcNotifications(step: any, task: any) {
    const ccUsers: string[] = step?.ccUsers ?? [];
    if (ccUsers.length === 0) return;

    for (const ccUserId of ccUsers) {
      try {
        await this.notificationService.create({
          userId: ccUserId,
          type: 'workflow_cc',
          title: '工作流审批抄送通知',
          content: `工作流 [${task.instance.resourceTitle}] 的步骤 [${task.stepName}] 已审批通过，特此抄送`,
        });
      } catch {
        this.logger.warn(`抄送通知发送失败: ccUserId=${ccUserId}`);
      }
    }
  }

  private async findAssigneeByRole(roleName: string, initiatorId: string) {
    const initiator = await this.prisma.user.findUnique({
      where: { id: initiatorId },
      select: { departmentId: true },
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

  /**
   * P0-1: 并行审批查找多个角色的审批人
   */
  private async findAssigneesByRoles(roleNames: string[], initiatorId: string) {
    const initiator = await this.prisma.user.findUnique({
      where: { id: initiatorId },
      select: { departmentId: true },
    });

    if (!initiator) {
      return [];
    }

    return await this.prisma.user.findMany({
      where: {
        departmentId: initiator.departmentId,
        role: { in: roleNames },
        status: 'active',
      },
    });
  }
}
