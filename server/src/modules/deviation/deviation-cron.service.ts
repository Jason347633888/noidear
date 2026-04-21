import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/**
 * 偏离统计预聚合定时任务 (BR-059)
 * 每小时整点将过去 1 小时的偏差记录聚合写入 Redis 缓存
 * 提升统计查询性能，避免实时全表扫描
 */
@Injectable()
export class DeviationCronService {
  private readonly logger = new Logger(DeviationCronService.name);
  private readonly CACHE_TTL_SECONDS = 7200; // 2 小时有效期

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 偏离统计预聚合（BR-059）
   * 每小时整点执行
   */
  @Cron('0 * * * *')
  async aggregateDeviationStats(): Promise<void> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const reports = await this.prisma.deviationReport.findMany({
        where: { createdAt: { gte: oneHourAgo, lt: now } },
        select: {
          fieldName: true,
          deviationType: true,
          deviationRate: true,
          templateId: true,
        },
      });

      const stats = {
        period: {
          from: oneHourAgo.toISOString(),
          to: now.toISOString(),
        },
        totalCount: reports.length,
        byType: {} as Record<string, number>,
        byTemplate: {} as Record<string, number>,
        avgDeviationRate: 0,
      };

      let totalRate = 0;
      for (const r of reports) {
        stats.byType[r.deviationType] = (stats.byType[r.deviationType] ?? 0) + 1;
        stats.byTemplate[r.templateId] = (stats.byTemplate[r.templateId] ?? 0) + 1;
        totalRate += r.deviationRate;
      }

      if (reports.length > 0) {
        stats.avgDeviationRate = totalRate / reports.length;
      }

      const cacheKey = `deviation:stats:hourly:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}`;
      await this.redisService.setex(cacheKey, this.CACHE_TTL_SECONDS, JSON.stringify(stats));

      this.logger.log(`偏离统计预聚合完成: ${reports.length} 条，缓存键 ${cacheKey}`);
    } catch (error) {
      this.logger.error(`偏离统计预聚合失败: ${error.message}`, error.stack);
    }
  }
}
