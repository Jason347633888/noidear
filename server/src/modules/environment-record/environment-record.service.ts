import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEnvironmentRecordDto } from './dto/create-environment-record.dto';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

@Injectable()
export class EnvironmentRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEnvironmentRecordDto, userId: string) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true },
    });

    if (!productionBatch) {
      throw new BadRequestException('生产批次不存在');
    }

    const location = await this.prisma.workshopArea.findFirst({
      where: {
        id: dto.location_id,
        company_id: '1',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });

    if (!location) {
      throw new BadRequestException('监测位置不存在或已停用');
    }

    const { location: _ignoredLocation, location_id, ...recordData } = dto;

    return this.prisma.environmentRecord.create({
      data: {
        ...recordData,
        location_id,
        location: location.name,
        company_id: '1',
        operator_id: userId,
        measured_at: new Date(),
      },
    });
  }

  async findAll(ownership: OwnershipContext, startDate?: string, endDate?: string) {
    const ownershipWhere = await this.buildOwnershipWhere(ownership);
    return this.prisma.environmentRecord.findMany({
      where: {
        ...ownershipWhere,
        ...(startDate || endDate
          ? {
              measured_at: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { measured_at: 'desc' },
      take: 200,
    });
  }

  private async buildOwnershipWhere(ownership: OwnershipContext): Promise<Record<string, unknown>> {
    // EnvironmentRecord uses operator_id FK
    if (ownership.roleCode === 'admin') return {};
    if (ownership.roleCode === 'user') {
      return { operator_id: ownership.userId };
    }
    // leader
    const depts = ownership.managedDepartmentIds ?? [];
    if (depts.length === 0) return { id: 'no-match' };
    const memberIds = await userIdsInDepts(this.prisma, depts);
    if (memberIds.length === 0) return { id: 'no-match' };
    return { operator_id: { in: memberIds } };
  }
}
