import { Injectable, NotFoundException } from '@nestjs/common';
import { MeasuringEquipment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';

const CALIBRATION_RESULT_FAIL = 'fail';
const STATUS_NORMAL = 'normal';
const STATUS_FAILED = 'failed';

@Injectable()
export class MeasuringEquipmentService {
  constructor(private prisma: PrismaService) {}

  getOverdueStatus(equipment: Pick<MeasuringEquipment, 'next_calibration_at' | 'status'>): boolean {
    if (!equipment.next_calibration_at) return false;
    if (equipment.status !== STATUS_NORMAL) return false;
    return equipment.next_calibration_at < new Date();
  }

  async createEquipment(dto: CreateEquipmentDto, companyId: string) {
    return this.prisma.measuringEquipment.create({
      data: { ...dto, company_id: companyId },
    });
  }

  async findAllEquipment(companyId: string) {
    const rows = await this.prisma.measuringEquipment.findMany({
      where: { company_id: companyId, status: { not: 'scrapped' } },
      include: {
        calibration_records: {
          orderBy: { calibrated_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((eq) => ({
      ...eq,
      isOverdue: this.getOverdueStatus(eq),
    }));
  }

  async findOverdue(companyId: string) {
    return this.prisma.measuringEquipment.findMany({
      where: {
        company_id: companyId,
        status: { not: 'scrapped' },
        next_calibration_at: { lte: new Date() },
      },
    });
  }

  async createCalibration(dto: CreateCalibrationDto, companyId: string) {
    const equipment = await this.prisma.measuringEquipment.findFirst({
      where: { id: dto.measuring_equipment_id, company_id: companyId },
    });
    if (!equipment) {
      throw new NotFoundException('计量器具不存在');
    }

    const calibratedAt = new Date(dto.calibrated_at);
    const validUntil = new Date(dto.valid_until);
    const isFail = dto.result === CALIBRATION_RESULT_FAIL;

    const record = await this.prisma.calibrationRecord.create({
      data: {
        company_id: companyId,
        measuring_equipment_id: dto.measuring_equipment_id,
        calibrated_at: calibratedAt,
        valid_until: validUntil,
        result: dto.result,
        calibration_body: dto.calibration_body,
        certificate_no: dto.certificate_no,
        notes: dto.notes,
      },
    });

    await this.prisma.measuringEquipment.update({
      where: { id: dto.measuring_equipment_id },
      data: {
        last_calibrated_at: calibratedAt,
        next_calibration_at: validUntil,
        status: isFail ? STATUS_FAILED : STATUS_NORMAL,
      },
    });

    return record;
  }

  async findById(equipmentId: string, companyId: string) {
    const equipment = await this.prisma.measuringEquipment.findFirst({
      where: { id: equipmentId, company_id: companyId },
      include: {
        calibration_records: { orderBy: { calibrated_at: 'desc' } },
      },
    });
    if (!equipment) throw new NotFoundException('计量器具不存在');

    return {
      ...equipment,
      isOverdue: this.getOverdueStatus(equipment),
    };
  }

  async findCalibrationsByEquipment(equipmentId: string, companyId: string) {
    const equipment = await this.prisma.measuringEquipment.findFirst({
      where: { id: equipmentId, company_id: companyId },
    });
    if (!equipment) {
      throw new NotFoundException('计量器具不存在');
    }

    return this.prisma.calibrationRecord.findMany({
      where: { measuring_equipment_id: equipmentId, company_id: companyId },
      orderBy: { calibrated_at: 'desc' },
    });
  }
}
