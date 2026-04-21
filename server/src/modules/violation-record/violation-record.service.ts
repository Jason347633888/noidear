import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateViolationDto } from './dto/create-violation.dto';

@Injectable()
export class ViolationRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateViolationDto, recordedBy: string) {
    return this.prisma.violationRecord.create({
      data: { ...dto, company_id: '1', occurred_at: new Date(), recorded_by: recordedBy },
    });
  }

  async findAll(employeeId?: string) {
    return this.prisma.violationRecord.findMany({
      where: employeeId ? { employee_id: employeeId } : {},
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
}
