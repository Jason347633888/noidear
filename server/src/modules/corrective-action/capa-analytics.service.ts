import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CapaAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrends(months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const actions = await this.prisma.correctiveAction.findMany({
      where: { company_id: '1', created_at: { gte: since } },
      include: { verification_records: true },
    });

    const byStatus = actions.reduce((acc: Record<string, number>, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {});

    const closed = actions.filter(a => a.status === 'closed' && a.closed_at);
    const avgCloseDays =
      closed.length > 0
        ? closed.reduce((sum, a) => {
            const days = (a.closed_at!.getTime() - a.created_at.getTime()) / 86400000;
            return sum + days;
          }, 0) / closed.length
        : 0;

    const monthly: Record<string, number> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = 0;
    }
    for (const a of actions) {
      const key = `${a.created_at.getFullYear()}-${String(a.created_at.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthly) monthly[key]++;
    }

    return {
      total: actions.length,
      by_status: byStatus,
      avg_close_days: Math.round(avgCloseDays * 10) / 10,
      monthly_trend: Object.entries(monthly)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({ month, count })),
    };
  }
}
