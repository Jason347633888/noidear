import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { Snowflake } from '../../common/utils';
import { Decimal } from '@prisma/client/runtime/library';

export const PERIODIC_REVIEW_CONCLUSIONS = ['continue_use', 'revise', 'retire'] as const;
export type PeriodicReviewConclusion = (typeof PERIODIC_REVIEW_CONCLUSIONS)[number];

export interface CreateDocumentVersionInput {
  filePath: string;
  fileName: string;
  fileSize: number;
  creatorId: string;
  notes?: string | null;
}

@Injectable()
export class DocumentPeriodicReviewService {
  private readonly snowflake = new Snowflake(1, 2);

  constructor(private readonly prisma: PrismaService) {}

  async createDocumentVersion(documentId: string, input: CreateDocumentVersionInput) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!doc) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    const currentVersion: Decimal =
      (doc as any).version instanceof Decimal
        ? (doc as any).version
        : new Decimal(String((doc as any).version ?? '1.0'));

    return this.prisma.documentVersion.create({
      data: {
        id: this.snowflake.nextId(),
        documentId,
        version: currentVersion,
        filePath: input.filePath,
        fileName: input.fileName,
        fileSize: input.fileSize,
        creatorId: input.creatorId,
        ...(input.notes != null ? { notes: input.notes } : {}),
      },
    });
  }

  async schedulePeriodicReview(
    documentId: string,
    dueAt: Date,
    reviewerId: string,
  ) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!doc) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }
    if ((doc as any).level !== 3) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '只有三级文件可以安排定期审查',
      );
    }

    return this.prisma.documentPeriodicReview.create({
      data: {
        documentId,
        dueAt,
        reviewerId,
        status: 'pending',
      },
    });
  }

  async completePeriodicReview(
    reviewTaskId: string,
    conclusion: PeriodicReviewConclusion,
    opinion: string | null,
  ) {
    const task = await this.prisma.documentPeriodicReview.findFirst({
      where: { id: reviewTaskId },
    });
    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '定期审查任务不存在');
    }
    if (task.status === 'completed') {
      throw new BusinessException(ErrorCode.CONFLICT, '该定期审查任务已完成');
    }
    if (!(PERIODIC_REVIEW_CONCLUSIONS as readonly string[]).includes(conclusion)) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        `结论值无效，允许值：${PERIODIC_REVIEW_CONCLUSIONS.join(' | ')}`,
      );
    }

    return this.prisma.documentPeriodicReview.update({
      where: { id: reviewTaskId },
      data: {
        status: 'completed',
        reviewedAt: new Date(),
        conclusion,
        opinion: opinion ?? null,
      },
    });
  }
}
