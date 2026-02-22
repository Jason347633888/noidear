import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { Snowflake } from '../../common/utils/snowflake';

/**
 * 告警定时任务服务
 * TASK-377: Cron Jobs for alert rule checking
 * TASK-364: Alert notifications
 */
@Injectable()
export class AlertScheduleService {
  private readonly logger = new Logger(AlertScheduleService.name);
  private readonly snowflake = new Snowflake(1, 2);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 检查所有告警规则
   * 每分钟执行一次
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlertRules() {
    try {
      const rules = await this.prisma.alertRule.findMany({
        where: { enabled: true },
      });

      if (rules.length === 0) {
        return;
      }

      let triggeredCount = 0;

      for (const rule of rules) {
        try {
          const latestMetric = await this.prisma.systemMetric.findFirst({
            where: { metricName: rule.metricName },
            orderBy: { timestamp: 'desc' },
          });

          if (!latestMetric) {
            continue;
          }

          const triggered = this.evaluateCondition(
            latestMetric.metricValue,
            rule.condition,
            rule.threshold,
          );

          if (triggered) {
            const message = `${rule.name} triggered: ${latestMetric.metricValue} ${rule.condition} ${rule.threshold}`;

            const alertHistory = await this.prisma.alertHistory.create({
              data: {
                ruleId: rule.id,
                metricValue: latestMetric.metricValue,
                status: 'triggered',
                message,
                notifiedUsers: JSON.stringify([]),
              },
            });

            triggeredCount++;

            this.logger.warn(`[Alert] Rule "${rule.name}" triggered: ${message}`);

            await this.sendAlertNotification(rule, alertHistory.id.toString(), message);
          }
        } catch (error) {
          this.logger.error(`Failed to check rule ${rule.id}: ${error.message}`);
        }
      }

      if (triggeredCount > 0) {
        this.logger.log(
          `[Alert Check] Checked ${rules.length} rules, ${triggeredCount} triggered`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[Alert Check] Failed to check alert rules: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 发送告警通知
   * TASK-364: Send alert notifications via configured channels
   */
  private async sendAlertNotification(
    rule: { id: bigint; name: string; severity: string; notifyChannels: any },
    alertHistoryId: string,
    message: string,
  ) {
    try {
      const channels: string[] = Array.isArray(rule.notifyChannels)
        ? rule.notifyChannels
        : [];

      if (channels.length === 0) {
        this.logger.debug(`[Alert] Rule "${rule.name}" has no notify channels configured`);
        return;
      }

      const notifiedUsers: string[] = [];

      for (const channel of channels) {
        if (channel === 'log') {
          this.logger.warn(
            `[ALERT NOTIFICATION] Severity: ${rule.severity} | Rule: ${rule.name} | ${message}`,
          );
          notifiedUsers.push('system-log');
        } else if (channel === 'system') {
          await this.createSystemNotification(rule.name, message, rule.severity);
          notifiedUsers.push('system');
        } else {
          this.logger.warn(
            `[Alert] Unknown notify channel "${channel}" for rule "${rule.name}"`,
          );
        }
      }

      if (notifiedUsers.length > 0) {
        await this.prisma.alertHistory.update({
          where: { id: BigInt(alertHistoryId) },
          data: { notifiedUsers: JSON.stringify(notifiedUsers) },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send alert notification for rule ${rule.name}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 创建系统内告警通知（写入系统通知表）
   * TASK-364: System notification for alert triggers
   */
  private async createSystemNotification(
    ruleName: string,
    message: string,
    severity: string,
  ) {
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'admin'] } },
        select: { id: true },
        take: 5,
      });

      if (adminUsers.length === 0) {
        this.logger.warn('[Alert] No admin users found to notify');
        return;
      }

      const notifications = adminUsers.map((user) => ({
        id: this.snowflake.nextId(),
        userId: user.id,
        title: `[${severity.toUpperCase()}] 告警: ${ruleName}`,
        content: message,
        type: 'alert',
      }));

      await this.prisma.notification.createMany({ data: notifications });

      this.logger.log(`[Alert] System notification sent to ${adminUsers.length} admin(s)`);
    } catch (error) {
      this.logger.warn(`[Alert] Could not create system notification: ${error.message}`);
    }
  }

  /**
   * 评估告警条件
   */
  private evaluateCondition(
    value: number,
    condition: string,
    threshold: number,
  ): boolean {
    switch (condition) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      default:
        this.logger.warn(`Unknown condition: ${condition}`);
        return false;
    }
  }
}
