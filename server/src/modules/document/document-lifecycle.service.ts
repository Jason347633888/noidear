import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishDocumentDto } from './dto/document-lifecycle.dto';
import { EFFECTIVE_COMPAT_STATUSES } from './constants/document-control.constants';

@Injectable()
export class DocumentLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(id: string, dto: PublishDocumentDto) {
    const doc = await this.prisma.document.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('文件不存在');

    const lineageKey = (doc as any).lineage_key ?? doc.number;
    const currentEffective = await this.prisma.document.findFirst({
      where: {
        id: { not: id },
        deletedAt: null,
        status: { in: [...EFFECTIVE_COMPAT_STATUSES] },
        OR: [
          { lineage_key: lineageKey } as any,
          { number: doc.number },
        ],
      },
    });

    const published = await this.prisma.document.update({
      where: { id },
      data: {
        status: 'effective',
        effective_date: dto.effective_date ? new Date(dto.effective_date) : new Date(),
        ...(dto.review_due_date ? { review_due_date: new Date(dto.review_due_date) } : {}),
      },
    });

    if (currentEffective) {
      await this.prisma.document.update({
        where: { id: currentEffective.id },
        data: {
          status: 'superseded',
          revisionStatus: 'superseded',
          superseded_by_id: id,
        } as any,
      });
    }

    return published;
  }

  async supersede(oldId: string, newId: string) {
    return this.prisma.document.update({
      where: { id: oldId },
      data: {
        status: 'superseded',
        superseded_by_id: newId,
      },
    });
  }

  async confirmRead(documentId: string, userId: string) {
    return this.prisma.documentReadConfirmation.upsert({
      where: { document_id_user_id: { document_id: documentId, user_id: userId } },
      update: { confirmed_at: new Date() },
      create: { document_id: documentId, user_id: userId },
    });
  }

  async getDueSoon(days = 30) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return this.prisma.document.findMany({
      where: {
        status: { in: [...EFFECTIVE_COMPAT_STATUSES] },
        review_due_date: { lte: deadline },
      },
      orderBy: { review_due_date: 'asc' },
    });
  }
}
