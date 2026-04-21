import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMedicationDto } from './dto/create-medication.dto';

@Injectable()
export class MedicationRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMedicationDto, _recordedBy: string) {
    return this.prisma.medicationRecord.create({
      data: { ...dto, company_id: '1', record_date: new Date() },
    });
  }

  async findAll(employeeId?: string, fitForDuty?: boolean) {
    const where: Record<string, unknown> = {};
    if (employeeId) where['employee_id'] = employeeId;
    if (fitForDuty !== undefined) where['fit_for_duty'] = fitForDuty;
    return this.prisma.medicationRecord.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
}
