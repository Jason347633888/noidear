import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * BR-312: 编号规则年度重置定时任务
 * 每年 1 月 1 日凌晨自动将所有编号规则的序号重置为 0
 */
@Injectable()
export class DocumentCronService {
  private readonly logger = new Logger(DocumentCronService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * BR-312: 年度重置编号序号
   * 每年 1 月 1 日凌晨 0 点执行
   */
  @Cron('0 0 1 1 *')
  async resetAnnualNumberSequences(): Promise<void> {
    try {
      const result = await this.prisma.numberRule.updateMany({
        data: { sequence: 0 },
      })

      this.logger.log(
        `BR-312 年度编号规则重置完成：共重置 ${result.count} 条规则序号`,
      )
    } catch (error) {
      this.logger.error('BR-312 年度编号规则重置失败', error)
    }
  }

  /**
   * BR-312: 手动触发年度重置（供管理员使用）
   */
  async manualResetSequences(): Promise<{ count: number }> {
    const result = await this.prisma.numberRule.updateMany({
      data: { sequence: 0 },
    })

    this.logger.log(`手动重置编号规则序号：共重置 ${result.count} 条`)
    return { count: result.count }
  }
}
