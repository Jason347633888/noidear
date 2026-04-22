import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ManagementDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [ncCount, capaOverdue, ccpRecords, docsExpiringSoon] =
      await Promise.all([
        this.prisma.nonConformance.count({
          where: { created_at: { gte: monthStart } },
        }),
        this.prisma.correctiveAction.count({
          where: {
            status: { not: 'closed' },
            due_date: { lt: now },
          },
        }),
        this.prisma.record.count({
          where: {
            template: { code: { contains: 'CCP' } },
            createdAt: { gte: monthStart },
          },
        }),
        this.prisma.document.count({
          where: {
            status: 'effective',
            review_due_date: {
              lte: new Date(now.getTime() + 30 * 86400000),
            },
          },
        }),
      ]);

    return {
      nc_count_this_month: ncCount,
      capa_overdue_count: capaOverdue,
      ccp_records_this_month: ccpRecords,
      docs_expiring_soon: docsExpiringSoon,
    };
  }

  async getBrcgsReadiness() {
    const now = new Date();

    const [expiringDocs, overdueCapas] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          status: 'effective',
          review_due_date: {
            lte: new Date(now.getTime() + 30 * 86400000),
          },
        },
        select: {
          id: true,
          title: true,
          number: true,
          review_due_date: true,
        },
        orderBy: { review_due_date: 'asc' },
      }),
      this.prisma.correctiveAction.findMany({
        where: {
          status: { not: 'closed' },
          due_date: { lt: now },
        },
        select: {
          id: true,
          capa_no: true,
          description: true,
          due_date: true,
        },
        orderBy: { due_date: 'asc' },
      }),
    ]);

    return { expiring_docs: expiringDocs, overdue_capas: overdueCapas };
  }
}
