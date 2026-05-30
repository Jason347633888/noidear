import { Injectable, NotFoundException } from '@nestjs/common';
import { MeasuringEquipment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NonConformanceService } from '../non-conformance/non-conformance.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';

const CALIBRATION_RESULT_FAIL = 'fail';
const STATUS_NORMAL = 'normal';
const STATUS_FAILED = 'failed';

export type CalibrationPointReadingInput = {
  position: string;
  standard_value: number;
  measured_value: number;
  tolerance?: number | null;
  error_value?: number | null;
  judgment: string;
  evidence_file_id?: string | null;
};

export type CreateCalibrationWithReadingsDto = CreateCalibrationDto & {
  readings: CalibrationPointReadingInput[];
  userId?: string;
};

@Injectable()
export class MeasuringEquipmentService {
  constructor(
    private prisma: PrismaService,
    private ncService: NonConformanceService,
  ) {}

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

  async createCalibrationRecordWithReadings(
    dto: CreateCalibrationWithReadingsDto,
    companyId: string,
  ) {
    const equipment = await this.prisma.measuringEquipment.findFirst({
      where: { id: dto.measuring_equipment_id, company_id: companyId },
    });
    if (!equipment) {
      throw new NotFoundException('计量器具不存在');
    }

    const calibratedAt = new Date(dto.calibrated_at);
    const validUntil = new Date(dto.valid_until);
    const hasFailedReading = dto.readings.some((r) => r.judgment === CALIBRATION_RESULT_FAIL);
    const result = hasFailedReading ? CALIBRATION_RESULT_FAIL : 'pass';

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.calibrationRecord.create({
        data: {
          company_id: companyId,
          measuring_equipment_id: dto.measuring_equipment_id,
          calibrated_at: calibratedAt,
          valid_until: validUntil,
          result,
          calibration_body: dto.calibration_body,
          certificate_no: dto.certificate_no,
          notes: dto.notes,
        },
      });

      const createdReadings = await Promise.all(
        dto.readings.map((r) =>
          tx.calibrationPointReading.create({
            data: {
              calibration_record_id: created.id,
              position: r.position,
              standard_value: r.standard_value,
              measured_value: r.measured_value,
              tolerance: r.tolerance ?? null,
              error_value: r.error_value ?? null,
              judgment: r.judgment,
              evidence_file_id: r.evidence_file_id ?? null,
            },
          }),
        ),
      );

      await tx.measuringEquipment.update({
        where: { id: dto.measuring_equipment_id },
        data: {
          last_calibrated_at: calibratedAt,
          next_calibration_at: validUntil,
          status: result === CALIBRATION_RESULT_FAIL ? STATUS_FAILED : STATUS_NORMAL,
        },
      });

      return { created, createdReadings };
    });

    if (result === CALIBRATION_RESULT_FAIL && dto.userId) {
      const failedPairs = dto.readings.reduce<Array<{ reading: typeof dto.readings[number]; dbId: string }>>(
        (acc, r, i) => {
          if (r.judgment === CALIBRATION_RESULT_FAIL) {
            acc.push({ reading: r, dbId: record.createdReadings[i].id });
          }
          return acc;
        },
        [],
      );
      for (const { reading, dbId } of failedPairs) {
        await this.ncService.createFromCalibrationReading({
          calibrationRecordId: record.created.id,
          readingId: dbId,
          companyId,
          userId: dto.userId,
          description: `校准点 ${reading.position} 不合格：标准值 ${reading.standard_value}，实测值 ${reading.measured_value}`,
        });
      }
    }

    return record.created;
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
