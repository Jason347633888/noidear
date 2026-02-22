import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';

/**
 * 审计日志定时任务服务
 * TASK-377: Cron Jobs for log cleanup and archival
 */
@Injectable()
export class AuditScheduleService {
  private readonly logger = new Logger(AuditScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 清理登录日志（保留90天）
   * BR-269: 登录日志保留 90 天
   * 每天凌晨 4:00 执行
   */
  @Cron('0 4 * * *')
  async cleanupLoginLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const deleted = await this.prisma.loginLog.deleteMany({
        where: { loginTime: { lt: cutoffDate } },
      });

      this.logger.log(
        `[Audit Cleanup] Deleted ${deleted.count} login logs older than 90 days`,
      );
    } catch (error) {
      this.logger.error(
        `[Audit Cleanup] Failed to cleanup login logs: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 归档审计日志到 MinIO（1年以上的日志）
   * BR-269: 权限变更日志永久保留（归档到 MinIO）
   * 每天凌晨 4:30 执行
   */
  @Cron('30 4 * * *')
  async archiveLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

      // 归档权限变更日志
      const permissionLogs = await this.prisma.permissionLog.findMany({
        where: { createdAt: { lt: cutoffDate } },
      });

      if (permissionLogs.length > 0) {
        const archiveData = JSON.stringify(permissionLogs, null, 2);
        const filename = `permission_logs_${new Date().toISOString().split('T')[0]}.json`;
        await this.storage.uploadBuffer(
          Buffer.from(archiveData),
          `audit-archive/${filename}`,
        );
        this.logger.log(
          `[Audit Archive] Archived ${permissionLogs.length} permission logs to ${filename}`,
        );
      }

      // 归档敏感操作日志
      const sensitiveLogs = await this.prisma.sensitiveLog.findMany({
        where: { createdAt: { lt: cutoffDate } },
      });

      if (sensitiveLogs.length > 0) {
        const archiveData = JSON.stringify(sensitiveLogs, null, 2);
        const filename = `sensitive_logs_${new Date().toISOString().split('T')[0]}.json`;
        await this.storage.uploadBuffer(
          Buffer.from(archiveData),
          `audit-archive/${filename}`,
        );
        this.logger.log(
          `[Audit Archive] Archived ${sensitiveLogs.length} sensitive logs to ${filename}`,
        );
      }

      if (permissionLogs.length === 0 && sensitiveLogs.length === 0) {
        this.logger.log('[Audit Archive] No logs to archive');
      }
    } catch (error) {
      this.logger.error(
        `[Audit Archive] Failed to archive logs: ${error.message}`,
        error.stack,
      );
    }
  }
}
