import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAcceptanceRecordDto {
  company_id: string;
  equipmentId: string;
  accepted_at: string;
  accepted_by?: string;
  result: string;
  checklist_snapshot?: Prisma.InputJsonValue;
  evidence_file_id?: string;
  approvalInstanceId?: string;
}

@Injectable()
export class EquipmentAcceptanceService {
  constructor(private readonly prisma: PrismaService) {}

  async createAcceptanceRecord(dto: CreateAcceptanceRecordDto) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: dto.equipmentId },
      select: { id: true, status: true, activationDate: true, deletedAt: true },
    });

    if (!equipment || equipment.deletedAt) {
      throw new NotFoundException('Equipment not found');
    }

    const acceptedAt = new Date(dto.accepted_at);

    if (dto.result === 'pass') {
      const activationDate = equipment.activationDate ? undefined : acceptedAt;
      return this.prisma.$transaction(async (tx) => {
        const record = await tx.equipmentAcceptanceRecord.create({
          data: {
            company_id: dto.company_id,
            equipmentId: dto.equipmentId,
            accepted_at: acceptedAt,
            accepted_by: dto.accepted_by ?? null,
            result: dto.result,
            checklist_snapshot: dto.checklist_snapshot ?? Prisma.JsonNull,
            evidence_file_id: dto.evidence_file_id ?? null,
            approvalInstanceId: dto.approvalInstanceId ?? null,
          },
        });

        await tx.equipment.update({
          where: { id: dto.equipmentId },
          data: {
            status: 'active',
            ...(activationDate !== undefined ? { activationDate } : {}),
          },
        });

        return record;
      });
    }

    return this.prisma.equipmentAcceptanceRecord.create({
      data: {
        company_id: dto.company_id,
        equipmentId: dto.equipmentId,
        accepted_at: acceptedAt,
        accepted_by: dto.accepted_by ?? null,
        result: dto.result,
        checklist_snapshot: dto.checklist_snapshot ?? Prisma.JsonNull,
        evidence_file_id: dto.evidence_file_id ?? null,
        approvalInstanceId: dto.approvalInstanceId ?? null,
      },
    });
  }

  async findByEquipment(equipmentId: string, companyId: string) {
    return this.prisma.equipmentAcceptanceRecord.findMany({
      where: { equipmentId, company_id: companyId },
      orderBy: { accepted_at: 'desc' },
    });
  }
}
