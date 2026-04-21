import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class RecycleBinCron {
  private readonly logger = new Logger(RecycleBinCron.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanExpiredItems() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    try {
      // 清理超过 30 天的已删除文档
      const deletedDocs = await this.prisma.document.deleteMany({
        where: {
          deletedAt: { lte: thirtyDaysAgo, not: null },
        },
      })

      // 清理超过 30 天的已删除记录模板（新版动态表单引擎）
      const deletedRecordTemplates = await this.prisma.recordTemplate.deleteMany({
        where: {
          deletedAt: { lte: thirtyDaysAgo, not: null },
        },
      })

      // 清理超过 30 天的已删除记录实例（新版动态表单引擎）
      const deletedRecords = await this.prisma.record.deleteMany({
        where: {
          deletedAt: { lte: thirtyDaysAgo, not: null },
        },
      })

      this.logger.log(
        `回收站清理完成：文档 ${deletedDocs.count} 条，记录模板 ${deletedRecordTemplates.count} 条，记录实例 ${deletedRecords.count} 条`,
      )
    } catch (error) {
      this.logger.error('回收站自动清理失败', error)
    }
  }
}
