import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

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

  async findDeviationReports(query: DeviationReportQueryDto, ownership?: OwnershipContext) {
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

    if (ownership) {
      const ownershipWhere = await this.buildOwnershipWhere(ownership);
      Object.assign(where, ownershipWhere);
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

  private async buildOwnershipWhere(ownership: OwnershipContext): Promise<Record<string, unknown>> {
    if (ownership.roleCode === 'admin') return {};
    if (ownership.roleCode === 'user') {
      return { reporterId: ownership.userId };
    }
    // leader
    const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
    if (memberIds.length === 0) return { id: 'no-match' };
    return { reporterId: { in: memberIds } };
  }

}
