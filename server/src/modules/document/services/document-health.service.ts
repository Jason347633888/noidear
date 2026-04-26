import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(days = 30) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    const [
      missingOwnerOrReview,
      overdueReview,
      expiredExternal,
      overdueReadRequirements,
      openTrainingNeeds,
      openImpactItems,
    ] = await Promise.all([
      this.prisma.document.count({ where: { deletedAt: null, OR: [{ owner_department: null }, { review_due_date: null }] } }),
      this.prisma.document.count({ where: { deletedAt: null, status: 'effective', review_due_date: { lt: new Date() } } }),
      this.prisma.document.count({ where: { deletedAt: null, document_type: 'EXTERNAL_FILE', external_expires_at: { lte: deadline } } }),
      this.prisma.documentReadRequirement.count({ where: { status: 'active', dueAt: { lt: new Date() } } }),
      this.prisma.documentTrainingNeed.count({ where: { status: { in: ['suggested', 'accepted'] } } }),
      this.prisma.documentImpactItem.count({ where: { status: 'open' } }),
    ]);

    return {
      missingOwnerOrReview,
      overdueReview,
      expiredExternal,
      overdueReadRequirements,
      openTrainingNeeds,
      openImpactItems,
    };
  }
}
