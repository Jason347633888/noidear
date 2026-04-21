import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';

@Injectable()
export class MeasuringEquipmentService {
  constructor(private prisma: PrismaService) {}

  async createEquipment(dto: CreateEquipmentDto) {
    return this.prisma.measuringEquipment.create({
      data: { ...dto, company_id: '1' },
    });
  }

  async findAllEquipment() {
    return this.prisma.measuringEquipment.findMany({
      where: { status: { not: 'scrapped' } },
      include: {
        calibration_records: {
          orderBy: { calibrated_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOverdue() {
    return this.prisma.measuringEquipment.findMany({
      where: {
        status: { not: 'scrapped' },
        next_calibration_at: { lte: new Date() },
      },
    });
  }

  async createCalibration(dto: CreateCalibrationDto) {
    const record = await this.prisma.calibrationRecord.create({
      data: {
        company_id: '1',
        measuring_equipment_id: dto.measuring_equipment_id,
        calibrated_at: new Date(dto.calibrated_at),
        valid_until: new Date(dto.valid_until),
        result: dto.result,
        calibration_body: dto.calibration_body,
        certificate_no: dto.certificate_no,
        notes: dto.notes,
      },
    });
    // 更新设备的下次校准日期
    await this.prisma.measuringEquipment.update({
      where: { id: dto.measuring_equipment_id },
      data: {
        last_calibrated_at: new Date(dto.calibrated_at),
        next_calibration_at: new Date(dto.valid_until),
        status: dto.result === 'fail' ? 'overdue' : 'normal',
      },
    });
    return record;
  }

  async findCalibrationsByEquipment(equipmentId: string) {
    return this.prisma.calibrationRecord.findMany({
      where: { measuring_equipment_id: equipmentId },
      orderBy: { calibrated_at: 'desc' },
    });
  }
}
