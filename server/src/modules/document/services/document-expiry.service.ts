import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type LinkWithDocument = {
  id: string;
  businessType: string;
  businessId: string;
  documentKind: string;
  expiresAt: Date | null;
  warningDays: number;
  status: string;
  document: {
    id: string;
    number: string;
    title: string;
    creatorId: string;
    owner_user_id?: string | null;
  };
};

@Injectable()
export class DocumentExpiryService {
  constructor(private readonly prisma: PrismaService) {}

  async scanAndCreateTodos(today = new Date()) {
    const links = await this.prisma.businessDocumentLink.findMany({
      where: { expiresAt: { not: null } },
      include: {
        document: {
          select: { id: true, number: true, title: true, creatorId: true, owner_user_id: true },
        },
      },
    }) as LinkWithDocument[];

    const counts = { scanned: links.length, expired: 0, expiringSoon: 0, valid: 0, todosUpserted: 0 };

    for (const link of links) {
      if (!link.expiresAt) continue;
      const status = this.calculateStatus(link, today);
      counts[status === 'expiring_soon' ? 'expiringSoon' : status] += 1;

      if (link.status !== status) {
        await this.prisma.businessDocumentLink.update({
          where: { id: link.id },
          data: { status },
        });
      }

      if (status === 'expired' || status === 'expiring_soon') {
        await this.upsertRenewalTodo(link, status);
        counts.todosUpserted += 1;
      }
    }

    return counts;
  }

  private calculateStatus(link: LinkWithDocument, today: Date): 'valid' | 'expiring_soon' | 'expired' {
    const expiresAt = this.startOfDay(link.expiresAt!);
    const current = this.startOfDay(today);
    if (expiresAt < current) return 'expired';

    const warningDate = new Date(current);
    warningDate.setDate(warningDate.getDate() + link.warningDays);
    return expiresAt <= warningDate ? 'expiring_soon' : 'valid';
  }

  private async upsertRenewalTodo(link: LinkWithDocument, status: 'expired' | 'expiring_soon') {
    const userId = link.document.owner_user_id || link.document.creatorId;
    const title = status === 'expired'
      ? `业务文件已到期: ${link.document.title}`
      : `业务文件即将到期: ${link.document.title}`;

    await this.prisma.todoTask.upsert({
      where: {
        userId_type_relatedId: {
          userId,
          type: 'document_renewal',
          relatedId: link.id,
        },
      },
      create: {
        userId,
        type: 'document_renewal',
        relatedId: link.id,
        title,
        description: `${link.businessType}/${link.businessId}/${link.documentKind} ${link.document.number}`,
        status: 'pending',
        priority: status === 'expired' ? 'high' : 'normal',
        dueDate: link.expiresAt,
      },
      update: {
        title,
        description: `${link.businessType}/${link.businessId}/${link.documentKind} ${link.document.number}`,
        status: 'pending',
        priority: status === 'expired' ? 'high' : 'normal',
        dueDate: link.expiresAt,
      },
    });
  }

  private startOfDay(value: Date): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
