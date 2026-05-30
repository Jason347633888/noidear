import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEnvironmentRecordDto } from './dto/create-environment-record.dto';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

const ALLOWED_RECORD_TYPES = new Set([
  'temperature_humidity',
  'pressure_differential',
  'fridge_temperature',
  'other',
]);

const REJECTED_INSPECTION_TYPES = new Set([
  'water_quality',
  'pest_control',
  'hygiene',
  'microbiology',
  'allergen',
  'vehicle_sanitation',
]);

@Injectable()
export class EnvironmentRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEnvironmentRecordDto, userId?: string) {
    if (REJECTED_INSPECTION_TYPES.has(dto.record_type)) {
      throw new BadRequestException(
        '水质、虫鼠害、卫生、微生物、过敏原和车辆卫生检查必须使用通用检验记录',
      );
    }

    if (!ALLOWED_RECORD_TYPES.has(dto.record_type)) {
      throw new BadRequestException(
        `不支持的记录类型: ${dto.record_type}`,
      );
    }

    const isBatchRecord = !!dto.production_batch_id;

    if (!isBatchRecord && !dto.location_id) {
      throw new BadRequestException('非批次环境记录必须选择点位');
    }

    if (isBatchRecord) {
      const productionBatch = await this.prisma.productionBatch.findUnique({
        where: { id: dto.production_batch_id },
        select: { id: true },
      });

      if (!productionBatch) {
        throw new BadRequestException('生产批次不存在');
      }
    }

    let resolvedLocation: string | undefined;

    if (dto.location_id) {
      const locationRecord = await this.prisma.workshopArea.findFirst({
        where: {
          id: dto.location_id,
          company_id: '1',
          status: 'active',
          deleted_at: null,
        },
        select: { id: true, name: true },
      });

      if (!locationRecord) {
        throw new BadRequestException('监测位置不存在或已停用');
      }

      resolvedLocation = locationRecord.name;
    }

    const { location: providedLocation, location_id, production_batch_id, ...recordData } = dto;

    return this.prisma.environmentRecord.create({
      data: {
        ...recordData,
        location_id,
        production_batch_id,
        location: resolvedLocation ?? providedLocation ?? '',
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
    // EnvironmentRecord uses operator_id FK.
    // NOTE (backfill): user role only sees records where operator_id matches userId.
    // Records created before the FK migration (or imported without operator_id) may have
    // operator_id = null and will NOT be visible to users until backfilled.
    // A best-effort backfill can be performed by setting operator_id to the record creator
    // if that information is available in a separate audit log. Until then, null records
    // are only visible to admin and leader roles.
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
