import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

/**
 * 待办任务定时服务
 * TASK-322: 待办逾期提醒
 */
@Injectable()
export class TodoScheduleService {
  private readonly logger = new Logger(TodoScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 待办逾期提醒
   * 每天早上 9:00 执行
   * BR-111: 待办任务逾期提醒
   */
  @Cron('0 9 * * *')
  async sendOverdueTodoReminders() {
    try {
      const now = new Date();

      // 查询所有逾期的待办任务
      const overdueTodos = await this.prisma.todoTask.findMany({
        where: {
          status: 'pending',
          dueDate: { lt: now },
        },
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
        },
      });

      let sentCount = 0;
      let failedCount = 0;

      // 为每个逾期待办发送提醒
      for (const todo of overdueTodos) {
        try {
          await this.notificationService.create({
            userId: todo.userId,
            type: 'todo_overdue',
            title: '待办任务逾期提醒',
            content: `您的待办任务"${todo.title}"已逾期，请尽快处理`,
          });
          sentCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to send overdue reminder for todo ${todo.id}: ${error.message}`,
          );
          failedCount++;
        }
      }

      this.logger.log(
        `[Todo Schedule] Overdue reminder completed: ${sentCount} sent, ${failedCount} failed, ${overdueTodos.length} total`,
      );
    } catch (error) {
      this.logger.error(
        `[Todo Schedule] Failed to send overdue reminders: ${error.message}`,
        error.stack,
      );
    }
  }
}
