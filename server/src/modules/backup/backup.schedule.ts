import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 备份定时任务服务
 * TASK-377: Cron Jobs for automatic backups and cleanup
 */
@Injectable()
export class BackupScheduleService {
  private readonly logger = new Logger(BackupScheduleService.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 触发 PostgreSQL 备份
   * 每天凌晨 2:00 执行
   */
  @Cron('0 2 * * *')
  async triggerPostgresBackup() {
    try {
      await this.backupService.triggerPostgresBackup();
      this.logger.log('[Backup Schedule] PostgreSQL backup completed');
    } catch (error) {
      this.logger.error(
        `[Backup Schedule] PostgreSQL backup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 触发 MinIO 备份
   * 每天凌晨 2:30 执行
   */
  @Cron('30 2 * * *')
  async triggerMinIOBackup() {
    try {
      await this.backupService.triggerMinIOBackup();
      this.logger.log('[Backup Schedule] MinIO backup completed');
    } catch (error) {
      this.logger.error(
        `[Backup Schedule] MinIO backup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 清理旧备份（保留最近7天）
   * 每天凌晨 5:00 执行
   */
  @Cron('0 5 * * *')
  async cleanupOldBackups() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const oldBackups = await this.prisma.backupHistory.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: 'success',
        },
      });

      let deletedCount = 0;
      for (const backup of oldBackups) {
        try {
          // 从数据库中删除记录
          await this.prisma.backupHistory.delete({
            where: { id: backup.id },
          });
          deletedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to delete backup ${backup.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `[Backup Cleanup] Deleted ${deletedCount} old backups (older than 7 days)`,
      );
    } catch (error) {
      this.logger.error(
        `[Backup Cleanup] Failed to cleanup old backups: ${error.message}`,
        error.stack,
      );
    }
  }
}
