import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 告警服务
 * TASK-364: Alert management service
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建告警历史记录
   */
  async createAlertHistory(data: {
    ruleId: bigint;
    metricValue: number;
    message: string;
    notifiedUsers: string[];
  }) {
    try {
      return await this.prisma.alertHistory.create({
        data: {
          ruleId: data.ruleId,
          metricValue: data.metricValue,
          message: data.message,
          status: 'triggered',
          notifiedUsers: JSON.stringify(data.notifiedUsers),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create alert history: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 查询告警规则
   */
  async queryAlertRules(enabled?: boolean) {
    try {
      const where: any = {};
      if (enabled !== undefined) {
        where.enabled = enabled;
      }

      return await this.prisma.alertRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to query alert rules: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 查询告警历史
   */
  async queryAlertHistory(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    try {
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [total, data] = await Promise.all([
        this.prisma.alertHistory.count({ where }),
        this.prisma.alertHistory.findMany({
          where,
          include: { rule: true },
          orderBy: { triggeredAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to query alert history: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
