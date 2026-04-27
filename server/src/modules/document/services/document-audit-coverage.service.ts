import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EFFECTIVE_COMPAT_STATUSES } from '../constants/document-control.constants';

@Injectable()
export class DocumentAuditCoverageService {
  constructor(private readonly prisma: PrismaService) {}

  async getCoverage(periodStart: Date, periodEnd: Date) {
    const documents = await this.prisma.document.findMany({
      where: { deletedAt: null, status: { in: [...EFFECTIVE_COMPAT_STATUSES] }, document_type: { in: ['PROCEDURE', 'WORK_INSTRUCTION'] } },
    });
    const reviews = await this.prisma.documentCoverageReview.findMany({
      where: { periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
    });
    const reviewMap = new Map(reviews.map((review: any) => [review.documentId, review]));

    return documents.map((document: any) => ({
      document,
      coverageStatus: reviewMap.get(document.id)?.coverageStatus ?? 'gap',
      review: reviewMap.get(document.id) ?? null,
    }));
  }
}
