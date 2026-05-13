import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from '../../common/services'
import { DocumentExpiryService } from './services/document-expiry.service'

/**
 * 文档模块定时任务服务
 * - BR-312: 默认编号计数器年度重置
 * - BR-050: 文件预览缓存清理（7 天）
 */
@Injectable()
export class DocumentCronService {
  private readonly logger = new Logger(DocumentCronService.name)
  private readonly PREVIEW_CACHE_PREFIX = 'previews/'
  private readonly PREVIEW_CACHE_MAX_DAYS = 7

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly documentExpiryService: DocumentExpiryService,
  ) {}

  /**
   * BR-312: 年度重置默认编号计数器序号
   * 每年 1 月 1 日凌晨 0 点执行
   */
  @Cron('0 0 1 1 *')
  async resetAnnualNumberSequences(): Promise<void> {
    try {
      const result = await this.prisma.documentNumberCounter.updateMany({
        data: { sequence: 0 },
      })

      this.logger.log(
        `BR-312 年度默认编号计数器重置完成：共重置 ${result.count} 条记录序号`,
      )
    } catch (error) {
      this.logger.error('BR-312 年度默认编号计数器重置失败', error)
    }
  }

  /**
   * BR-312: 手动触发年度重置（供管理员使用）
   */
  async manualResetSequences(): Promise<{ count: number }> {
    const result = await this.prisma.documentNumberCounter.updateMany({
      data: { sequence: 0 },
    })

    this.logger.log(`手动重置默认编号计数器序号：共重置 ${result.count} 条`)
    return { count: result.count }
  }

  /**
   * BR-050: 文件预览缓存清理
   * 每日 03:00 清理 MinIO 中超过 7 天的预览缓存文件
   */
  @Cron('0 3 * * *')
  async cleanupPreviewCache(): Promise<void> {
    try {
      const objects = await this.storageService.listObjects(this.PREVIEW_CACHE_PREFIX)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - this.PREVIEW_CACHE_MAX_DAYS)

      const staleObjects = objects.filter((obj) => obj.lastModified < cutoff)

      let deletedCount = 0
      for (const obj of staleObjects) {
        try {
          await this.storageService.deleteFile(obj.name)
          deletedCount++
        } catch (err) {
          this.logger.warn(`删除预览缓存文件失败 ${obj.name}: ${err.message}`)
        }
      }

      this.logger.log(`文件预览缓存清理完成: 删除 ${deletedCount}/${staleObjects.length} 个超期文件`)
    } catch (error) {
      this.logger.error(`文件预览缓存清理失败: ${error.message}`, error.stack)
    }
  }

  @Cron('0 2 * * *')
  async scanDocumentExpiry(): Promise<void> {
    try {
      const result = await this.documentExpiryService.scanAndCreateTodos()
      this.logger.log(`业务文件到期扫描完成: ${JSON.stringify(result)}`)
    } catch (error) {
      this.logger.error(`业务文件到期扫描失败: ${error.message}`, error.stack)
    }
  }
}
