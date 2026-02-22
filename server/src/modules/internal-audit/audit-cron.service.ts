import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

/**
 * 内审整改期限监控定时任务
 * 每天早上9点检查逾期未完成的整改任务并发送提醒通知
 */
@Injectable()
export class AuditCronService {
  private readonly logger = new Logger(AuditCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 每天早上9点检查逾期整改任务
   * 对 status IN ['pending', 'rectifying'] 且 dueDate < 当前日期的 AuditFinding 发送提醒
   */
  @Cron('0 9 * * *')
  async checkOverdueRectifications() {
    this.logger.log('[AuditCron] Starting overdue rectification check');

    try {
      const overdueFindings = await this.fetchOverdueFindings();

      if (overdueFindings.length === 0) {
        this.logger.log('[AuditCron] No overdue rectification findings');
        return;
      }

      await this.sendOverdueNotifications(overdueFindings);

      this.logger.log(
        `[AuditCron] Sent overdue reminders for ${overdueFindings.length} findings`,
      );
    } catch (error) {
      this.logger.error(
        `[AuditCron] Overdue rectification check failed: ${error.message}`,
        error.stack,
      );
    }
  }

  private async fetchOverdueFindings() {
    return this.prisma.auditFinding.findMany({
      where: {
        status: { in: ['pending', 'rectifying'] },
        dueDate: { lt: new Date() },
        assigneeId: { not: null },
      },
      select: {
        id: true,
        description: true,
        dueDate: true,
        assigneeId: true,
        plan: { select: { title: true } },
      },
    });
  }

  private async sendOverdueNotifications(findings: any[]) {
    await Promise.all(findings.map((f) => this.notifyFinding(f)));
  }

  private async notifyFinding(finding: any) {
    try {
      await this.notificationService.create({
        userId: finding.assigneeId,
        type: 'reminder',
        title: '整改任务逾期提醒',
        content: this.buildNotificationContent(finding),
      });
    } catch (error) {
      this.logger.warn(
        `[AuditCron] Failed to notify ${finding.assigneeId} for finding ${finding.id}: ${error.message}`,
      );
    }
  }

  private buildNotificationContent(finding: any): string {
    const planTitle = finding.plan?.title ?? '未知计划';
    const rawDate = finding.dueDate ? finding.dueDate.toISOString() : null;
    const dueDate = rawDate ? rawDate.split('T')[0] : '未知';
    const rawDesc = finding.description ?? '';
    const desc = rawDesc.substring(0, 50);
    return `内审计划「${planTitle}」中的整改任务「${desc}」已于 ${dueDate} 逾期，请尽快完成整改。`;
  }
}
