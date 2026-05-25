import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DeviationReportQueryDto {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

@Injectable()
export class DeviationService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findDeviationReports(query: DeviationReportQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.lte = new Date(query.endDate);
      }
      where.createdAt = dateFilter;
    }

    const [list, total] = await Promise.all([
      this.prisma.deviationReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deviationReport.count({ where }),
    ]);

    return { list, total, page, limit };
  }

}
