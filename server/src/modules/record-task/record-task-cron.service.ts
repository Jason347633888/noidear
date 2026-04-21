import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { RecordTaskInstanceService } from './record-task-instance.service';

@Injectable()
export class RecordTaskCronService {
  private readonly logger = new Logger(RecordTaskCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly instanceService: RecordTaskInstanceService,
  ) {}

  /** 每日 08:00：为周期任务生成新实例并通知部门成员 */
  @Cron('0 8 * * *')
  async generatePeriodicInstances() {
    this.logger.log('开始生成周期任务实例...');
    const assignments = await this.prisma.recordTaskAssignment.findMany({
      where: { isPeriodic: true, status: 'active' },
    });
    for (const assignment of assignments) {
      try {
        await this.processAssignment(assignment);
      } catch (error) {
        this.logger.error(`处理任务配置 ${assignment.id} 失败: ${error.message}`);
      }
    }
  }

  /** 每日 00:01：标记逾期实例 */
  @Cron('1 0 * * *')
  async markOverdueInstances() {
    this.logger.log('开始标记逾期任务实例...');
    await this.instanceService.markOverdue();
  }

  private async processAssignment(assignment: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (!this.shouldGenerateToday(assignment)) {
      return;
    }

    const existing = await this.prisma.recordTaskInstance.findFirst({
      where: { assignmentId: assignment.id, createdAt: { gte: today, lt: tomorrow } },
    });
    if (existing) {
      return;
    }

    const deadline = this.calculateDeadline(assignment);
    const instance = await this.prisma.recordTaskInstance.create({
      data: { assignmentId: assignment.id, deadline },
    });

    await this.notifyDepartmentMembers(assignment, instance);
  }

  private shouldGenerateToday(assignment: any): boolean {
    const { periodType, periodConfig } = assignment;
    const now = new Date();
    if (periodType === 'daily') return true;
    if (periodType === 'weekly') {
      const weekday = (periodConfig as any)?.weekday ?? 1;
      return now.getDay() === weekday % 7;
    }
    if (periodType === 'monthly') {
      const day = (periodConfig as any)?.day ?? 1;
      return now.getDate() === day;
    }
    return false;
  }

  private calculateDeadline(assignment: any): Date {
    const deadline = new Date();
    const daysMap: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };
    const days = daysMap[assignment.periodType] ?? 7;
    deadline.setDate(deadline.getDate() + days);
    deadline.setHours(23, 59, 59, 0);
    return deadline;
  }

  private async notifyDepartmentMembers(assignment: any, instance: any) {
    const members = await this.prisma.user.findMany({
      where: { departmentId: assignment.departmentId, status: 'active' },
      select: { id: true },
    });

    const notifications = members.map((m) => ({
      userId: m.id,
      type: 'record_task',
      title: `新任务：${assignment.title}`,
      content: `请在截止日期前完成填报，截止时间：${instance.deadline.toLocaleDateString()}`,
    }));

    if (notifications.length > 0) {
      await this.notificationService.createMany(notifications);
    }
  }
}
