import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ImpactReviewCreateDto, ImpactItemUpdateDto } from '../dto/document-operations.dto';

@Injectable()
export class DocumentImpactService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(dto: ImpactReviewCreateDto) {
    const references = dto.sourceType === 'document'
      ? await this.prisma.documentReference.findMany({ where: { sourceDocId: dto.sourceId } })
      : [];
    const landingEntries = dto.sourceType === 'document'
      ? await this.prisma.recordFormLandingEntry.findMany({ where: { relatedDocIds: { has: dto.sourceId } } })
      : [];

    return this.prisma.documentImpactReview.create({
      data: {
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        title: dto.title,
        items: {
          create: [
            ...references.map((ref: any) => ({
              targetType: ref.targetType,
              targetId: ref.targetId ?? ref.targetDocId,
              targetRoute: ref.targetRoute,
              targetLabel: ref.targetLabel ?? ref.targetId ?? ref.targetRoute ?? '未命名影响项',
              relationType: ref.relationType,
              impactLevel: 'medium',
              suggestedAction: 'Review linked target for impact',
            })),
            ...landingEntries.map((entry: any) => ({
              targetType: 'record_form_landing',
              targetId: entry.sourceCode,
              targetRoute: entry.targetRoute,
              targetLabel: entry.sourceCode,
              relationType: 'REQUIRES_RECORD',
              impactLevel: entry.targetRoute ? 'medium' : 'high',
              suggestedAction: entry.targetRoute ? 'Review record form entrance' : 'Complete missing target route',
            })),
          ],
        },
      },
      include: { items: true },
    });
  }

  async updateItem(id: string, dto: ImpactItemUpdateDto) {
    const item = await this.prisma.documentImpactItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('影响项不存在');
    return this.prisma.documentImpactItem.update({ where: { id }, data: dto });
  }
}
