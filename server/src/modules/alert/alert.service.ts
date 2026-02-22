import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  QueryAlertHistoryDto,
} from './dto';

/**
 * 告警管理服务
 * TASK-364: Alert Management APIs
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建告警规则
   */
  async createAlertRule(dto: CreateAlertRuleDto) {
    try {
      return await this.prisma.alertRule.create({
        data: {
          name: dto.name,
          metricName: dto.metricName,
          condition: dto.condition,
          threshold: dto.threshold,
          severity: dto.severity,
          enabled: dto.enabled ?? true,
          notifyChannels: dto.notifyChannels,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create alert rule: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 更新告警规则
   */
  async updateAlertRule(id: string, dto: UpdateAlertRuleDto) {
    try {
      const rule = await this.prisma.alertRule.findUnique({
        where: { id: BigInt(id) },
      });

      if (!rule) {
        throw new NotFoundException(`Alert rule with ID ${id} not found`);
      }

      return await this.prisma.alertRule.update({
        where: { id: BigInt(id) },
        data: {
          name: dto.name,
          metricName: dto.metricName,
          condition: dto.condition,
          threshold: dto.threshold,
          severity: dto.severity,
          enabled: dto.enabled,
          notifyChannels: dto.notifyChannels,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update alert rule: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 删除告警规则
   */
  async deleteAlertRule(id: string) {
    try {
      const rule = await this.prisma.alertRule.findUnique({
        where: { id: BigInt(id) },
      });

      if (!rule) {
        throw new NotFoundException(`Alert rule with ID ${id} not found`);
      }

      return await this.prisma.alertRule.delete({
        where: { id: BigInt(id) },
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete alert rule: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 切换告警规则启用状态
   */
  async toggleAlertRule(id: string) {
    try {
      const rule = await this.prisma.alertRule.findUnique({
        where: { id: BigInt(id) },
      });

      if (!rule) {
        throw new NotFoundException(`Alert rule with ID ${id} not found`);
      }

      return await this.prisma.alertRule.update({
        where: { id: BigInt(id) },
        data: { enabled: !rule.enabled },
      });
    } catch (error) {
      this.logger.error(
        `Failed to toggle alert rule: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 查询告警规则
   */
  async queryAlertRules(filters?: { metricName?: string; enabled?: boolean }) {
    try {
      const where: any = {};
      if (filters?.metricName) where.metricName = filters.metricName;
      if (filters?.enabled !== undefined) where.enabled = filters.enabled;

      return await this.prisma.alertRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { alertHistory: { take: 5, orderBy: { triggeredAt: 'desc' } } },
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
  async queryAlertHistory(dto: QueryAlertHistoryDto) {
    try {
      const where: any = {};
      if (dto.ruleId) where.ruleId = BigInt(dto.ruleId);
      if (dto.status) where.status = dto.status;
      if (dto.startDate || dto.endDate) {
        where.triggeredAt = {};
        if (dto.startDate) where.triggeredAt.gte = new Date(dto.startDate);
        if (dto.endDate) where.triggeredAt.lte = new Date(dto.endDate);
      }

      const page = dto.page || 1;
      const limit = dto.limit || 20;

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

  /**
   * 确认告警
   */
  async acknowledgeAlert(id: string, userId: string) {
    try {
      const alert = await this.prisma.alertHistory.findUnique({
        where: { id: BigInt(id) },
      });

      if (!alert) {
        throw new NotFoundException(`Alert with ID ${id} not found`);
      }

      return await this.prisma.alertHistory.update({
        where: { id: BigInt(id) },
        data: {
          status: 'acknowledged',
          notifiedUsers: JSON.stringify([userId]),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to acknowledge alert: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 触发告警 (供内部使用，根据规则自动触发)
   */
  async triggerAlert(ruleId: string, metricValue: number, message?: string) {
    try {
      return await this.prisma.alertHistory.create({
        data: {
          ruleId: BigInt(ruleId),
          metricValue,
          status: 'triggered',
          message,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to trigger alert: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(id: string) {
    try {
      const alert = await this.prisma.alertHistory.findUnique({
        where: { id: BigInt(id) },
      });

      if (!alert) {
        throw new NotFoundException(`Alert with ID ${id} not found`);
      }

      return await this.prisma.alertHistory.update({
        where: { id: BigInt(id) },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to resolve alert: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
