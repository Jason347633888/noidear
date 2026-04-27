import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { isEffectiveCompatible } from '../constants/document-control.constants';

@Injectable()
export class DocumentTrainingNeedService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestForDocument(documentId: string, actorId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId, deletedAt: null } });
    if (!document) throw new NotFoundException('文件不存在');

    const targetDepartment = (document as any).owner_department ?? null;
    const existing = await this.prisma.documentTrainingNeed.findFirst({
      where: { documentId, targetDepartment, status: { in: ['suggested', 'accepted', 'linked'] } },
    });
    if (existing) return existing;

    return this.prisma.documentTrainingNeed.create({
      data: {
        documentId,
        triggerType: isEffectiveCompatible(document.status) ? 'revised_document' : 'manual',
        targetDepartment,
        reason: `文件 ${document.title} 已发布或变更，需要评估培训需求`,
        createdBy: actorId,
      },
    });
  }

  async list(status?: string) {
    const validStatuses = ['suggested', 'accepted', 'dismissed', 'linked'];
    if (status && !validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Valid values: ${validStatuses.join(', ')}`);
    }
    return this.prisma.documentTrainingNeed.findMany({
      where: status ? { status } : {},
      include: {
        document: { select: { id: true, title: true, number: true, status: true } },
        linkedTrainingProject: { select: { id: true, title: true, status: true, scheduledDate: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async accept(id: string) {
    const need = await this.prisma.documentTrainingNeed.findUnique({ where: { id } });
    if (!need) throw new NotFoundException('培训需求不存在');
    if (need.status === 'dismissed') throw new ConflictException('已驳回的培训需求不能接受');
    return this.prisma.documentTrainingNeed.update({ where: { id }, data: { status: 'accepted' } });
  }

  async dismiss(id: string, reason?: string) {
    if (!reason) throw new BadRequestException('dismiss reason is required');
    const need = await this.prisma.documentTrainingNeed.findUnique({ where: { id } });
    if (!need) throw new NotFoundException('培训需求不存在');
    return this.prisma.documentTrainingNeed.update({
      where: { id },
      data: { status: 'dismissed', dismissedReason: reason },
    });
  }

  async link(id: string, linkedTrainingProjectId?: string) {
    if (!linkedTrainingProjectId) throw new BadRequestException('linkedTrainingProjectId is required');

    const need = await this.prisma.documentTrainingNeed.findUnique({ where: { id } });
    if (!need) throw new NotFoundException('培训需求不存在');

    const project = await this.prisma.trainingProject.findUnique({
      where: { id: linkedTrainingProjectId },
      select: { id: true, title: true, status: true },
    });
    if (!project) throw new NotFoundException('培训项目不存在');

    return this.prisma.documentTrainingNeed.update({
      where: { id },
      data: { status: 'linked', linkedTrainingProjectId },
    });
  }
}
