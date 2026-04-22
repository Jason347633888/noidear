import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishDocumentDto } from './dto/document-lifecycle.dto';

@Injectable()
export class DocumentLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(id: string, dto: PublishDocumentDto) {
    const doc = await this.prisma.document.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('文件不存在');

    return this.prisma.document.update({
      where: { id },
      data: {
        status: 'effective',
        effective_date: dto.effective_date ? new Date(dto.effective_date) : new Date(),
        ...(dto.review_due_date ? { review_due_date: new Date(dto.review_due_date) } : {}),
      },
    });
  }

  async supersede(oldId: string, newId: string) {
    await this.prisma.document.update({
      where: { id: oldId },
      data: { status: 'superseded', superseded_by_id: newId },
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
        status: 'effective',
        review_due_date: { lte: deadline },
      },
      orderBy: { review_due_date: 'asc' },
    });
  }
}
