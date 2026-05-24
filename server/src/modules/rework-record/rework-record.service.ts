import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReworkRecordDto } from './dto/create-rework-record.dto';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

@Injectable()
export class ReworkRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReworkRecordDto, companyId: string, creatorId?: string) {
    const ncId = dto.nc_id?.trim();
    if (!ncId) {
      throw new BadRequestException('关联不合格记录不能为空');
    }

    const nonConformance = await this.prisma.nonConformance.findFirst({
      where: { id: ncId, company_id: companyId },
      select: { id: true, source_type: true, source_id: true },
    });
    if (!nonConformance) {
      throw new BadRequestException('关联不合格记录不存在');
    }

    if (nonConformance.source_type === 'production_batch' && nonConformance.source_id !== dto.production_batch_id) {
      throw new BadRequestException('返工生产批次必须与不合格来源批次一致');
    }

    return this.prisma.reworkRecord.create({
      data: {
        ...dto,
        nc_id: ncId,
        company_id: companyId,
        rework_date: new Date(dto.rework_date),
        rework_qty: dto.rework_qty,
        ...(dto.operator_id === undefined && creatorId !== undefined ? { operator_id: creatorId } : {}),
      },
    });
  }

  async findAll(companyId: string, ownership: OwnershipContext, startDate?: string, endDate?: string) {
    const ownershipWhere = await this.buildOwnershipWhere(ownership);
    return this.prisma.reworkRecord.findMany({
      where: {
        company_id: companyId,
        ...ownershipWhere,
        ...(startDate || endDate
          ? {
              rework_date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { rework_date: 'desc' },
      take: 200,
    });
  }

  private async buildOwnershipWhere(ownership: OwnershipContext): Promise<Record<string, unknown>> {
    if (ownership.roleCode === 'admin') return {};
    if (ownership.roleCode === 'user') {
      return { operator_id: ownership.userId };
    }
    // leader
    const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
    if (memberIds.length === 0) return { id: 'no-match' };
    return { operator_id: { in: memberIds } };
  }

  async remove(id: string, companyId: string) {
    const record = await this.prisma.reworkRecord.findFirst({
      where: { id, company_id: companyId },
    });
    if (!record) throw new NotFoundException('返工记录不存在');

    return this.prisma.reworkRecord.delete({ where: { id } });
  }
}
