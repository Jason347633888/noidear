import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 消息定时清理服务
 * 每日 03:00 删除已读且超过 30 天的通知（30 天保留策略）
 */
@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 消息自动清理（30 天保留策略）
   * 每日 03:00 执行
   */
  @Cron('0 3 * * *')
  async cleanupOldNotifications(): Promise<void> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const result = await this.prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: { lt: cutoff },
        },
      });

      this.logger.log(`通知清理完成: 删除 ${result.count} 条 30 天前的已读通知`);
    } catch (error) {
      this.logger.error(`通知清理失败: ${error.message}`, error.stack);
    }
  }
}
