import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 告警定时任务服务
 * TASK-377: Cron Jobs for alert rule checking
 */
@Injectable()
export class AlertScheduleService {
  private readonly logger = new Logger(AlertScheduleService.name);

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
          // 获取最新的指标值
          const latestMetric = await this.prisma.systemMetric.findFirst({
            where: { metricName: rule.metricName },
            orderBy: { timestamp: 'desc' },
          });

          if (!latestMetric) {
            continue;
          }

          // 评估告警条件
          const triggered = this.evaluateCondition(
            latestMetric.metricValue,
            rule.condition,
            rule.threshold,
          );

          if (triggered) {
            // 创建告警历史记录
            await this.prisma.alertHistory.create({
              data: {
                ruleId: rule.id,
                metricValue: latestMetric.metricValue,
                status: 'triggered',
                message: `${rule.name} triggered: ${latestMetric.metricValue} ${rule.condition} ${rule.threshold}`,
                notifiedUsers: JSON.stringify([]),
              },
            });

            triggeredCount++;

            this.logger.warn(
              `[Alert] Rule "${rule.name}" triggered: ${latestMetric.metricValue} ${rule.condition} ${rule.threshold}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to check rule ${rule.id}: ${error.message}`,
          );
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
