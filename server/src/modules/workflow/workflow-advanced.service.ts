import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { DelegateTaskDto } from './dto/delegate-task.dto';
import { RollbackTaskDto } from './dto/rollback-task.dto';
import { TransferTaskDto } from './dto/transfer-task.dto';
import { ConditionParser } from './condition-parser';

/**
 * 高级工作流引擎服务
 * TASK-385: 支持条件分支、审批委托、审批抄送、审批回退
 */
@Injectable()
export class WorkflowAdvancedService {
  private readonly logger = new Logger(WorkflowAdvancedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 委托审批任务
   * BR-340: 流程转办可转办给其他人
   */
  async delegateTask(taskId: string, dto: DelegateTaskDto, userId: string) {
    const task = await this.findPendingTaskOrFail(taskId);
    this.assertIsAssignee(task, userId);

    const toUser = await this.findUserOrFail(dto.toUserId);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.workflowTask.update({
        where: { id: taskId },
        data: { delegatedTo: dto.toUserId, assigneeId: dto.toUserId },
      });

      await prisma.delegationLog.create({
        data: {
          taskId,
          fromUserId: userId,
          toUserId: dto.toUserId,
          reason: dto.reason,
          delegatedAt: new Date(),
        },
      });
    });

    await this.sendNotification(dto.toUserId, 'workflow_delegated', '审批任务已委托给您', `工作流 [${task.instance.resourceTitle}] 的步骤 [${task.stepName}] 已委托给您处理`);

    // TASK-381: 委托后向当前步骤的抄送用户发送通知
    await this.sendStepCcNotifications(task);

    return { success: true, message: `审批任务已委托给 ${toUser.name}` };
  }

  /**
   * 回退审批任务
   * BR-339: 流程回退支持回退到上一步/任意步
   */
  async rollbackTask(taskId: string, dto: RollbackTaskDto, userId: string) {
    const task = await this.findPendingTaskOrFail(taskId);
    this.assertIsAssignee(task, userId);

    const targetStep = dto.targetStepIndex ?? task.stepIndex - 1;

    if (targetStep < 0) {
      throw new BadRequestException('无法回退到步骤索引 0 之前');
    }

    if (targetStep >= task.stepIndex) {
      throw new BadRequestException('目标步骤索引必须小于当前步骤');
    }

    const template = task.instance.template;
    const steps = template.steps as any[];

    if (targetStep >= steps.length) {
      throw new BadRequestException('目标步骤索引超出范围');
    }

    const targetStepDef = steps[targetStep];

    await this.prisma.$transaction(async (prisma) => {
      // 关闭当前任务
      await prisma.workflowTask.update({
        where: { id: taskId },
        data: { status: 'rolled_back', comment: dto.reason || '审批回退', completedAt: new Date() },
      });

      // 回退到目标步骤，重新创建任务
      await prisma.workflowInstance.update({
        where: { id: task.instanceId },
        data: { status: 'pending', currentStep: targetStep },
      });

      const assignee = await this.findAssigneeByRole(
        prisma,
        targetStepDef.assigneeRole,
        task.instance.initiatorId,
      );

      if (assignee) {
        const dueAt = new Date();
        dueAt.setHours(dueAt.getHours() + (targetStepDef.timeoutHours || 24));

        await prisma.workflowTask.create({
          data: {
            instanceId: task.instanceId,
            stepIndex: targetStep,
            stepName: targetStepDef.name,
            assigneeId: assignee.id,
            status: 'pending',
            dueAt,
          },
        });
      }
    });

    return { success: true, message: `审批已回退至步骤 ${targetStep + 1}` };
  }

  /**
   * 转办审批任务
   * BR-340: 流程转办
   */
  async transferTask(taskId: string, dto: TransferTaskDto, userId: string) {
    const task = await this.findPendingTaskOrFail(taskId);
    this.assertIsAssignee(task, userId);

    const toUser = await this.findUserOrFail(dto.toUserId);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.workflowTask.update({
        where: { id: taskId },
        data: { assigneeId: dto.toUserId },
      });

      await prisma.delegationLog.create({
        data: {
          taskId,
          fromUserId: userId,
          toUserId: dto.toUserId,
          reason: dto.reason || '任务转办',
          delegatedAt: new Date(),
        },
      });
    });

    await this.sendNotification(dto.toUserId, 'workflow_transferred', '审批任务已转办给您', `工作流 [${task.instance.resourceTitle}] 的步骤 [${task.stepName}] 已转办给您`);

    return { success: true, message: `审批任务已转办给 ${toUser.name}` };
  }

  /**
   * 查询委托日志
   */
  async getDelegationLogs(taskId?: string, page = 1, limit = 20) {
    const where = taskId ? { taskId } : {};
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.delegationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { delegatedAt: 'desc' },
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
          task: { select: { id: true, stepName: true } },
        },
      }),
      this.prisma.delegationLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * 解析条件表达式（用于测试）
   */
  evaluateCondition(expression: string, context: Record<string, unknown>): boolean {
    return ConditionParser.evaluate(expression, context);
  }

  private async findPendingTaskOrFail(taskId: string) {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
      include: { instance: { include: { template: true } } },
    });

    if (!task) throw new NotFoundException(`任务 ${taskId} 不存在`);
    if (task.status !== 'pending') {
      throw new BadRequestException(`任务状态为 ${task.status}，无法操作`);
    }

    return task;
  }

  private assertIsAssignee(task: any, userId: string) {
    if (task.assigneeId !== userId) {
      throw new ForbiddenException('仅当前审批人可进行此操作');
    }
  }

  private async findUserOrFail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`用户 ${userId} 不存在`);
    return user;
  }

  private async findAssigneeByRole(prisma: any, roleName: string, initiatorId: string) {
    const initiator = await prisma.user.findUnique({
      where: { id: initiatorId },
      select: { departmentId: true },
    });

    if (!initiator) return null;

    return prisma.user.findFirst({
      where: { departmentId: initiator.departmentId, role: roleName, status: 'active' },
    });
  }

  private async sendNotification(userId: string, type: string, title: string, content: string) {
    try {
      await this.notificationService.create({ userId, type, title, content });
    } catch {
      this.logger.warn(`通知发送失败: userId=${userId}, type=${type}`);
    }
  }

  /**
   * TASK-381: 向当前步骤的抄送用户发送通知
   */
  private async sendStepCcNotifications(task: any) {
    const steps = task.instance.template?.steps as any[] | undefined;
    if (!Array.isArray(steps)) return;

    const currentStep = steps[task.stepIndex];
    const ccUsers: string[] = currentStep?.ccUsers ?? [];

    for (const ccUserId of ccUsers) {
      await this.sendNotification(
        ccUserId,
        'workflow_cc',
        '工作流审批委托抄送',
        `工作流 [${task.instance.resourceTitle}] 的步骤 [${task.stepName}] 已委托处理，特此抄送`,
      );
    }
  }
}
