import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TrackViewDto } from './dto/track-view.dto';
import {
  UserDocMatrix,
  findSimilarUsers,
  generateRecommendations,
} from './collaborative-filter';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly CACHE_TTL = 3600; // 1 小时
  private readonly CACHE_PREFIX = 'recommendations:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 记录用户文档访问行为
   * BR-320: 最近访问记录
   */
  async trackView(userId: string, dto: TrackViewDto) {
    const document = await this.prisma.document.findFirst({
      where: { id: dto.documentId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException('文档不存在');
    }

    await this.prisma.documentViewLog.create({
      data: {
        userId,
        documentId: dto.documentId,
        duration: dto.duration ?? 0,
        viewedAt: new Date(),
      },
    });

    // 失效推荐缓存
    await this.redis.del(`${this.CACHE_PREFIX}${userId}`);

    return { success: true, message: '访问记录已保存' };
  }

  /**
   * 获取我的推荐文档（按 score 排序）
   * BR-321: 文档统计显示阅读量
   */
  async getMyRecommendations(userId: string, limit = 10) {
    const cacheKey = `${this.CACHE_PREFIX}${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      return { data: data.slice(0, limit), fromCache: true };
    }

    const recommendations = await this.prisma.documentRecommendation.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            number: true,
            level: true,
            status: true,
            fileType: true,
            createdAt: true,
            updatedAt: true,
            creator: { select: { id: true, name: true } },
          },
        },
      },
    });

    const result = recommendations.map((rec) => ({
      documentId: rec.documentId,
      score: rec.score,
      reason: rec.reason || '查看此文档的用户还查看了...',
      document: rec.document,
    }));

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return { data: result, fromCache: false };
  }

  /**
   * 批量生成推荐（定时任务，每小时执行）
   */
  @Cron(CronExpression.EVERY_HOUR)
  async generateAllRecommendations() {
    this.logger.log('开始批量生成文档推荐...');
    try {
      await this.runRecommendationGeneration();
      this.logger.log('批量生成文档推荐完成');
    } catch (error) {
      this.logger.error('批量生成推荐失败', error.stack);
    }
  }

  /**
   * 手动触发批量生成推荐
   */
  async triggerGeneration() {
    await this.runRecommendationGeneration();
    return { success: true, message: '推荐生成任务已完成' };
  }

  private async runRecommendationGeneration() {
    // 构建用户-文档矩阵（最近 30 天数据）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewLogs = await this.prisma.documentViewLog.findMany({
      where: { viewedAt: { gte: thirtyDaysAgo } },
      select: { userId: true, documentId: true, duration: true },
    });

    const matrix: UserDocMatrix = {};
    for (const log of viewLogs) {
      if (!matrix[log.userId]) matrix[log.userId] = {};
      // 权重：阅读时长（秒）/ 60，最小 1
      const weight = Math.max(1, Math.floor(log.duration / 60));
      matrix[log.userId][log.documentId] =
        (matrix[log.userId][log.documentId] || 0) + weight;
    }

    const userIds = Object.keys(matrix);
    let processedCount = 0;

    for (const userId of userIds) {
      try {
        const similarUsers = findSimilarUsers(userId, matrix);
        const recs = generateRecommendations(userId, similarUsers, matrix);

        // 批量 upsert 推荐结果
        for (const rec of recs) {
          await this.prisma.documentRecommendation.upsert({
            where: { userId_documentId: { userId, documentId: rec.documentId } },
            create: {
              userId,
              documentId: rec.documentId,
              score: rec.score,
              reason: '查看此文档的用户还查看了...',
            },
            update: {
              score: rec.score,
            },
          });
        }

        // 清除缓存
        await this.redis.del(`${this.CACHE_PREFIX}${userId}`);
        processedCount++;
      } catch (error) {
        this.logger.error(`生成用户 ${userId} 推荐失败`, error.message);
      }
    }

    this.logger.log(`已为 ${processedCount} 个用户生成推荐`);
  }
}
