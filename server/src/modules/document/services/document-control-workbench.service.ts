import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentControlWorkbenchService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(days = 30) {
    const safeDays = Math.min(Math.max(days, 1), 365);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + safeDays);

    const [
      pendingReview,
      dueForReview,
      expiringExternalFiles,
      obsoleteReferences,
      brokenReferences,
      missingLandingTargets,
      missingMetadata,
    ] = await Promise.all([
      this.prisma.document.findMany({
        where: { deletedAt: null, status: { in: ['pending_review', 'pending'] } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.document.findMany({
        where: { deletedAt: null, status: 'effective', review_due_date: { lte: deadline } },
        orderBy: { review_due_date: 'asc' },
      }),
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          document_type: 'EXTERNAL_FILE',
          external_expires_at: { lte: deadline },
          status: { in: ['effective', 'approved'] },
        },
        orderBy: { external_expires_at: 'asc' },
      }),
      this.prisma.documentReference.findMany({
        where: { targetDoc: { status: { in: ['obsolete', 'archived'] } } },
        include: {
          sourceDoc: { select: { id: true, title: true, status: true } },
          targetDoc: { select: { id: true, title: true, status: true } },
        },
      }),
      this.prisma.documentReference.findMany({
        where: {
          targetType: { in: ['record_template', 'record_list', 'business_module', 'business_object'] },
          targetRoute: null,
        },
        include: { sourceDoc: { select: { id: true, title: true, status: true } } },
      }),
      this.prisma.recordFormLandingEntry.findMany({
        where: { OR: [{ targetRoute: null }, { targetModule: null }] },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          OR: [
            { document_type: null },
            { source_folder: null },
            { review_due_date: null },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      pendingReview,
      dueForReview,
      expiringExternalFiles,
      obsoleteReferences,
      brokenReferences,
      missingLandingTargets,
      missingMetadata,
      counts: {
        pendingReview: pendingReview.length,
        dueForReview: dueForReview.length,
        expiringExternalFiles: expiringExternalFiles.length,
        obsoleteReferences: obsoleteReferences.length,
        brokenReferences: brokenReferences.length,
        missingLandingTargets: missingLandingTargets.length,
        missingMetadata: missingMetadata.length,
      },
    };
  }
}
