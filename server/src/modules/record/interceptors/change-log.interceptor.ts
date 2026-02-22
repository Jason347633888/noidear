import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../../prisma/prisma.service';
import { Record } from '@prisma/client';

/**
 * ChangeLogInterceptor
 * BR-251: 已审批记录修改时自动记录变更历史（BRCGS合规）
 */
@Injectable()
export class ChangeLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ChangeLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const recordId = request.params.id;
    const userId = request.user?.userId;
    const reason = request.body?.reason || '数据修改';

    const oldRecord = await this.getOldRecord(recordId);

    return next.handle().pipe(
      tap((newRecord) => this.logChangeIfNeeded(oldRecord, newRecord, recordId, userId, reason)),
    );
  }

  private async getOldRecord(recordId: string): Promise<Record | null> {
    try {
      return await this.prisma.record.findUnique({ where: { id: recordId } });
    } catch {
      return null;
    }
  }

  private async logChangeIfNeeded(
    oldRecord: Record | null,
    newRecord: Record | null,
    recordId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    if (!this.shouldLogChange(oldRecord, newRecord, userId)) {
      return;
    }

    try {
      await this.prisma.recordChangeLog.create({
        data: {
          recordId,
          oldData: oldRecord!.dataJson as any,
          newData: newRecord!.dataJson as any,
          changedBy: userId,
          reason,
        },
      });
    } catch {
      this.logger.error('Change log creation failed');
    }
  }

  private shouldLogChange(
    oldRecord: Record | null,
    newRecord: Record | null,
    userId: string,
  ): boolean {
    return Boolean(
      oldRecord &&
      newRecord &&
      userId &&
      oldRecord.status === 'approved',
    );
  }
}
