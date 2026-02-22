import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import {
  BatchSyncDto,
  BatchSyncResponseDto,
  SyncResultItemDto,
  SyncStatusResponseDto,
} from './dto/sync.dto';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 批量同步表单记录
   * - UUID 去重：已存在的记录跳过
   * - 数据校验：formId 是否存在
   * - 部分失败处理：返回每条记录的状态
   */
  async batchSync(
    dto: BatchSyncDto,
    userId: string,
  ): Promise<BatchSyncResponseDto> {
    const results: SyncResultItemDto[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const submission of dto.submissions) {
      try {
        // UUID 去重检查
        const existing = await this.prisma.syncSubmission.findUnique({
          where: { uuid: submission.uuid },
        });

        if (existing) {
          // 已存在的记录视为成功（幂等性）
          results.push({
            uuid: submission.uuid,
            success: true,
          });
          successCount++;
          continue;
        }

        // 校验 formId 是否为有效的记录模板
        const template = await this.prisma.recordTemplate.findUnique({
          where: { id: submission.formId },
        });

        if (!template) {
          results.push({
            uuid: submission.uuid,
            success: false,
            error: `表单模板不存在: ${submission.formId}`,
          });
          failedCount++;
          continue;
        }

        // 在事务中创建同步记录
        await this.prisma.$transaction(async (tx) => {
          // 保存同步记录
          await tx.syncSubmission.create({
            data: {
              uuid: submission.uuid,
              userId,
              formId: submission.formId,
              data: submission.data as object,
              status: 'synced',
            },
          });

          // 同时创建正式的 Record 记录
          const recordNumber = await this.generateRecordNumber(tx, template.code);
          await tx.record.create({
            data: {
              templateId: submission.formId,
              number: recordNumber,
              dataJson: submission.data as object,
              status: 'draft',
              createdBy: userId,
              submittedAt: new Date(),
            },
          });
        });

        results.push({
          uuid: submission.uuid,
          success: true,
        });
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        results.push({
          uuid: submission.uuid,
          success: false,
          error: errorMessage,
        });
        failedCount++;

        // 记录失败的同步
        try {
          await this.prisma.syncSubmission.create({
            data: {
              uuid: submission.uuid,
              userId,
              formId: submission.formId,
              data: submission.data as object,
              status: 'failed',
              error: errorMessage,
            },
          });
        } catch {
          // 如果记录失败也出错（例如 UUID 冲突），忽略
        }
      }
    }

    return { results, successCount, failedCount };
  }

  /**
   * 查询同步状态
   */
  async getSyncStatus(userId: string): Promise<SyncStatusResponseDto> {
    const [pendingCount, lastSync] = await Promise.all([
      this.prisma.syncSubmission.count({
        where: { userId, status: 'failed' },
      }),
      this.prisma.syncSubmission.findFirst({
        where: { userId, status: 'synced' },
        orderBy: { syncedAt: 'desc' },
        select: { syncedAt: true },
      }),
    ]);

    return {
      pendingCount,
      lastSyncTime: lastSync?.syncedAt ?? null,
    };
  }

  /**
   * 生成记录编号
   */
  private async generateRecordNumber(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    templateCode: string,
  ): Promise<string> {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const prefix = `${templateCode}-${dateStr}`;

    // 查找当天最大序号
    const lastRecord = await tx.record.findFirst({
      where: {
        number: { startsWith: prefix },
      },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    let sequence = 1;
    if (lastRecord) {
      const parts = lastRecord.number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
}
