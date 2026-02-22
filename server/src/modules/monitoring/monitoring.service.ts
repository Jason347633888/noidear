import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordMetricDto, QueryMetricsDto } from './dto';

/**
 * 监控服务
 * TASK-363: Store and query metrics from database
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录指标到数据库
   */
  async recordMetric(dto: RecordMetricDto) {
    try {
      return await this.prisma.systemMetric.create({
        data: {
          metricName: dto.metricName,
          metricValue: dto.metricValue,
          metricType: dto.metricType,
          tags: dto.tags,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record metric: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 批量记录指标
   */
  async recordMetrics(dtos: RecordMetricDto[]) {
    try {
      return await this.prisma.systemMetric.createMany({
        data: dtos.map((dto) => ({
          metricName: dto.metricName,
          metricValue: dto.metricValue,
          metricType: dto.metricType,
          tags: dto.tags,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to record metrics in batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 查询指标
   */
  async queryMetrics(dto: QueryMetricsDto) {
    try {
      const where: any = {};
      if (dto.metricName) where.metricName = dto.metricName;
      if (dto.metricType) where.metricType = dto.metricType;
      if (dto.startDate || dto.endDate) {
        where.timestamp = {};
        if (dto.startDate) where.timestamp.gte = new Date(dto.startDate);
        if (dto.endDate) where.timestamp.lte = new Date(dto.endDate);
      }

      const page = dto.page || 1;
      const limit = dto.limit || 100;

      const [total, data] = await Promise.all([
        this.prisma.systemMetric.count({ where }),
        this.prisma.systemMetric.findMany({
          where,
          orderBy: { timestamp: 'desc' },
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
        `Failed to query metrics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 获取指标统计
   */
  async getMetricStats(metricName: string, startDate: Date, endDate: Date) {
    try {
      const metrics = await this.prisma.systemMetric.findMany({
        where: {
          metricName,
          timestamp: { gte: startDate, lte: endDate },
        },
        orderBy: { timestamp: 'asc' },
      });

      if (metrics.length === 0) {
        return {
          count: 0,
          min: 0,
          max: 0,
          avg: 0,
          sum: 0,
        };
      }

      const values = metrics.map((m) => m.metricValue);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      return {
        count: metrics.length,
        min,
        max,
        avg,
        sum,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get metric stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 删除过期指标 (保留最近 30 天)
   */
  async cleanupOldMetrics() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.systemMetric.deleteMany({
        where: {
          timestamp: { lt: thirtyDaysAgo },
        },
      });
      this.logger.log(`Cleaned up ${result.count} old metrics`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old metrics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
