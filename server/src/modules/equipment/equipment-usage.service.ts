import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

export interface CreateUsageRecordDto {
  company_id: string;
  equipmentId?: string;
  measuringEquipmentId?: string;
  used_from: string;
  used_to?: string;
  purpose: string;
  sample_reference?: string;
  operatorId?: string;
  equipment_status_after: string;
  notes?: string;
}

@Injectable()
export class EquipmentUsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  async createUsageRecord(dto: CreateUsageRecordDto) {
    this.validateEquipmentXor(dto);

    if (dto.equipmentId) {
      await this.assertNotScrapped(dto.equipmentId);
    }

    if (dto.equipment_status_after === 'fault') {
      return this.prisma.$transaction(async (tx) => {
        const record = await tx.equipmentUsageRecord.create({
          data: {
            company_id: dto.company_id,
            equipmentId: dto.equipmentId ?? null,
            measuringEquipmentId: dto.measuringEquipmentId ?? null,
            used_from: new Date(dto.used_from),
            used_to: dto.used_to ? new Date(dto.used_to) : null,
            purpose: dto.purpose,
            sample_reference: dto.sample_reference ?? null,
            operatorId: dto.operatorId ?? null,
            equipment_status_after: dto.equipment_status_after,
            notes: dto.notes ?? null,
          },
        });

        await this.createFaultNonConformance(tx, record.id, dto);

        return record;
      });
    }

    return this.prisma.equipmentUsageRecord.create({
      data: {
        company_id: dto.company_id,
        equipmentId: dto.equipmentId ?? null,
        measuringEquipmentId: dto.measuringEquipmentId ?? null,
        used_from: new Date(dto.used_from),
        used_to: dto.used_to ? new Date(dto.used_to) : null,
        purpose: dto.purpose,
        sample_reference: dto.sample_reference ?? null,
        operatorId: dto.operatorId ?? null,
        equipment_status_after: dto.equipment_status_after,
        notes: dto.notes ?? null,
      },
    });
  }

  async findByEquipment(equipmentId: string, companyId: string) {
    return this.prisma.equipmentUsageRecord.findMany({
      where: { equipmentId, company_id: companyId },
      orderBy: { used_from: 'desc' },
    });
  }

  private validateEquipmentXor(dto: CreateUsageRecordDto): void {
    const hasEquipment = !!dto.equipmentId;
    const hasMeasuring = !!dto.measuringEquipmentId;
    if (hasEquipment && hasMeasuring) {
      throw new BadRequestException(
        'Exactly one of equipmentId or measuringEquipmentId must be set',
      );
    }
    if (!hasEquipment && !hasMeasuring) {
      throw new BadRequestException(
        'Exactly one of equipmentId or measuringEquipmentId must be set',
      );
    }
  }

  private async assertNotScrapped(equipmentId: string): Promise<void> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!equipment || equipment.deletedAt) {
      throw new NotFoundException('Equipment not found');
    }
    if (equipment.status === 'scrapped') {
      throw new BadRequestException('Cannot create usage record for scrapped equipment');
    }
  }

  private async createFaultNonConformance(
    tx: Prisma.TransactionClient,
    usageRecordId: string,
    dto: CreateUsageRecordDto,
  ): Promise<void> {
    const nc_no = await this.numberSequence.generateNonConformanceNo(dto.company_id);
    const description = dto.equipmentId
      ? `设备使用后状态异常（故障）；使用记录ID：${usageRecordId}`
      : `计量设备使用后状态异常（故障）；使用记录ID：${usageRecordId}`;

    await tx.nonConformance.create({
      data: {
        company_id: dto.company_id,
        nc_no,
        source_type: 'equipment_usage_record',
        source_id: usageRecordId,
        nc_type: 'equipment_fault',
        description,
        discovered_by: dto.operatorId ?? null,
        discoveredById: dto.operatorId ?? null,
        discovered_at: new Date(),
      },
    });
  }
}
