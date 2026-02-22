import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'equipment:stats:';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getOverview() {
    return this.withCache('overview', async () => {
      const [total, active, inactive, scrapped] = await Promise.all([
        this.prisma.equipment.count({ where: { deletedAt: null } }),
        this.prisma.equipment.count({ where: { status: 'active', deletedAt: null } }),
        this.prisma.equipment.count({ where: { status: 'inactive', deletedAt: null } }),
        this.prisma.equipment.count({ where: { status: 'scrapped', deletedAt: null } }),
      ]);
      return { total, active, inactive, scrapped };
    });
  }

  async getMaintenanceStats() {
    return this.withCache('maintenance', async () => {
      const levels = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
      const stats: Record<string, any> = {};

      for (const level of levels) {
        const [total, completed] = await Promise.all([
          this.prisma.maintenanceRecord.count({
            where: { maintenanceLevel: level as any, deletedAt: null },
          }),
          this.prisma.maintenanceRecord.count({
            where: { maintenanceLevel: level as any, status: 'approved', deletedAt: null },
          }),
        ]);
        stats[level] = { total, completed, rate: total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : '0%' };
      }

      return stats;
    });
  }

  async getFaultRateStats() {
    return this.withCache('fault-rate', async () => {
      const equipment = await this.prisma.equipment.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true, name: true },
      });

      const results = await Promise.all(
        equipment.map(async (eq) => {
          const faultCount = await this.prisma.equipmentFault.count({
            where: { equipmentId: eq.id, deletedAt: null },
          });
          return { ...eq, faultCount };
        }),
      );

      return results
        .sort((a, b) => b.faultCount - a.faultCount)
        .slice(0, 20);
    });
  }

  async getCostStats(year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    return this.withCache(`cost-${targetYear}`, async () => {
      const months: Record<string, number> = {};

      for (let month = 1; month <= 12; month++) {
        const start = new Date(targetYear, month - 1, 1);
        const end = new Date(targetYear, month, 0, 23, 59, 59);

        const result = await this.prisma.maintenanceRecord.aggregate({
          where: {
            maintenanceDate: { gte: start, lte: end },
            status: 'approved',
            deletedAt: null,
          },
          _sum: { cost: true },
        });

        const key = `${targetYear}-${String(month).padStart(2, '0')}`;
        months[key] = result._sum.cost ?? 0;
      }

      return months;
    });
  }

  async getRepairStats(year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    return this.withCache(`repair-${targetYear}`, async () => {
      const months: Record<string, any> = {};

      for (let month = 1; month <= 12; month++) {
        const start = new Date(targetYear, month - 1, 1);
        const end = new Date(targetYear, month, 0, 23, 59, 59);

        const [total, completed] = await Promise.all([
          this.prisma.equipmentFault.count({
            where: { reportTime: { gte: start, lte: end }, deletedAt: null },
          }),
          this.prisma.equipmentFault.count({
            where: {
              reportTime: { gte: start, lte: end },
              status: 'completed',
              deletedAt: null,
            },
          }),
        ]);

        const key = `${targetYear}-${String(month).padStart(2, '0')}`;
        months[key] = { total, completed };
      }

      return months;
    });
  }

  /**
   * Clear specific cache keys
   */
  async clearCache(keys: string[]) {
    try {
      const fullKeys = keys.map(key => `${CACHE_PREFIX}${key}`);
      await Promise.all(fullKeys.map(key => this.redis.del(key)));
      this.logger.log(`Cleared cache for keys: ${keys.join(', ')}`);
    } catch (error) {
      this.logger.warn(`Failed to clear cache: ${error?.message}`);
    }
  }

  /**
   * Clear all equipment statistics cache
   */
  async clearAllCache() {
    try {
      const pattern = `${CACHE_PREFIX}*`;
      await this.redis.del(pattern);
      this.logger.log(`Cleared all equipment stats cache`);
    } catch (error) {
      this.logger.warn(`Failed to clear all cache: ${error?.message}`);
    }
  }

  // --- Private cache helper ---

  private async withCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cacheKey = `${CACHE_PREFIX}${key}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      this.logger.warn(`Redis cache miss for key: ${cacheKey}`);
    }

    const data = await fetcher();

    try {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    } catch {
      this.logger.warn(`Failed to cache key: ${cacheKey}`);
    }

    return data;
  }
}
