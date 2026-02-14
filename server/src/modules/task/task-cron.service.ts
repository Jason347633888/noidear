import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

interface OverdueTask {
  id: string;
  status: string;
  departmentId: string;
  deadline: Date;
  department: { id: string; name: string };
}

@Injectable()
export class TaskCronService {
  private readonly logger = new Logger(TaskCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Daily cron job to detect and mark overdue tasks.
   * Runs at midnight every day (0 0 * * *).
   *
   * A task is overdue when:
   * - status is 'pending' or 'submitted' (not yet completed)
   * - deadline has passed
   * - task is not soft-deleted
   */
  @Cron('0 0 * * *')
  async handleOverdueTasks(): Promise<void> {
    try {
      const overdueTasks = await this.findOverdueTasks();

      if (overdueTasks.length === 0) {
        this.logger.log('No overdue tasks found');
        return;
      }

      this.logger.log(`Found ${overdueTasks.length} overdue tasks, processing...`);

      await this.markTasksAsOverdue(overdueTasks);
      await this.notifyDepartments(overdueTasks);
    } catch (error) {
      this.logger.error(
        `Failed to process overdue tasks: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async findOverdueTasks(): Promise<OverdueTask[]> {
    return this.prisma.task.findMany({
      where: {
        status: { in: ['pending', 'submitted'] },
        deadline: { lt: new Date() },
        deletedAt: null,
      },
      include: {
        department: true,
      },
    });
  }

  private async markTasksAsOverdue(tasks: OverdueTask[]): Promise<void> {
    const taskIds = tasks.map((task) => task.id);
    try {
      await this.prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: { status: 'overdue' },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to batch mark tasks as overdue: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async notifyDepartments(tasks: OverdueTask[]): Promise<void> {
    const uniqueDeptIds = [...new Set(tasks.map((t) => t.departmentId))];

    for (const deptId of uniqueDeptIds) {
      const taskCount = tasks.filter((t) => t.departmentId === deptId).length;
      await this.sendDepartmentNotification(deptId, taskCount);
    }
  }

  private async sendDepartmentNotification(
    departmentId: string,
    taskCount: number,
  ): Promise<void> {
    try {
      const members = await this.prisma.user.findMany({
        where: { departmentId, status: 'active' },
        select: { id: true },
      });

      if (members.length === 0) {
        return;
      }

      const notifications = members.map((member) => ({
        userId: member.id,
        type: 'task',
        title: '任务逾期提醒',
        content: `您所在的部门有 ${taskCount} 个逾期任务，请尽快处理。`,
      }));

      await this.notificationService.createMany(notifications);
    } catch (error) {
      this.logger.warn(
        `Failed to send overdue notifications for department ${departmentId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
