import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

/**
 * 仓库定时任务服务
 * - BR-181~185: 供应商资质过期检查
 * - BR-247~250: 物料平衡偏差告警
 */
@Injectable()
export class WarehouseCronService {
  private readonly logger = new Logger(WarehouseCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 供应商资质过期检查 (BR-181~185)
   * 每日 09:00 扫描
   * - 临期 30 天：发预警通知
   * - 到期当日：将供应商资质状态改为 expired，供应商状态改为 suspended
   */
  @Cron('0 9 * * *')
  async checkSupplierCredentialExpiry(): Promise<void> {
    try {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiredToday = await this.prisma.supplierQualification.findMany({
        where: { validUntil: { lte: now }, status: 'valid' },
        include: { supplier: { select: { id: true, name: true } } },
      });

      for (const qual of expiredToday) {
        await this.prisma.supplierQualification.update({
          where: { id: qual.id },
          data: { status: 'expired' },
        });
        await this.prisma.supplier.update({
          where: { id: qual.supplierId },
          data: { status: 'suspended' },
        });
        this.logger.warn(`供应商 [${qual.supplier.name}] 资质已过期，状态改为 suspended`);
      }

      const expiringSoon = await this.prisma.supplierQualification.findMany({
        where: { validUntil: { gt: now, lte: in30Days }, status: 'valid' },
        include: { supplier: { select: { id: true, name: true } } },
      });

      for (const qual of expiringSoon) {
        const daysLeft = Math.ceil(
          (qual.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        try {
          await this.notificationService.create({
            userId: 'system',
            type: 'supplier_credential_expiry',
            title: '供应商资质临期预警',
            content: `供应商 [${qual.supplier.name}] 的 ${qual.qualificationType} 资质将在 ${daysLeft} 天后到期（${qual.validUntil.toLocaleDateString('zh-CN')}），请及时更新。`,
          } as any);
        } catch {
          // 通知失败不阻断主流程
        }
      }

      this.logger.log(`供应商资质检查: ${expiredToday.length} 个已过期，${expiringSoon.length} 个临期`);
    } catch (error) {
      this.logger.error(`供应商资质过期检查失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 物料平衡偏差告警 (BR-247~250)
   * 每日 08:00 查询 status=alert 的物料平衡记录并通知仓库主管
   */
  @Cron('0 8 * * *')
  async checkMaterialBalanceDeviation(): Promise<void> {
    try {
      const threshold = parseFloat(process.env.MATERIAL_BALANCE_THRESHOLD ?? '5');

      const alertBalances = await this.prisma.materialBalance.findMany({
        where: {
          status: 'alert',
          deviationRate: { gt: threshold },
        },
        include: {
          productionBatch: { select: { batchNumber: true } },
        },
      });

      if (alertBalances.length > 0) {
        const summary = alertBalances
          .map((b) => `批次 ${b.productionBatch.batchNumber} 偏差率 ${b.deviationRate.toFixed(2)}%`)
          .join('；');

        try {
          await this.notificationService.create({
            userId: 'system',
            type: 'material_balance_deviation',
            title: '物料平衡偏差告警',
            content: `发现 ${alertBalances.length} 条物料平衡偏差超过阈值 ${threshold}%：${summary}，请尽快盘点确认。`,
          } as any);
        } catch {
          // 通知失败不阻断主流程
        }
      }

      this.logger.log(`物料平衡偏差检查: ${alertBalances.length} 条记录超过阈值`);
    } catch (error) {
      this.logger.error(`物料平衡偏差告警失败: ${error.message}`, error.stack);
    }
  }
}
