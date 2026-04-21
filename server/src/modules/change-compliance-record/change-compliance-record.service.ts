import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChangeComplianceRecordDto } from './dto/create-change-compliance-record.dto';

@Injectable()
export class ChangeComplianceRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChangeComplianceRecordDto, userId: string) {
    return this.prisma.changeComplianceRecord.create({
      data: {
        company_id: '1',
        change_event_id: dto.change_event_id,
        assessor_id: dto.assessor_id ?? userId,
        legal_compliance: dto.legal_compliance ?? true,
        safety_impact: dto.safety_impact,
        risk_level: dto.risk_level,
        conclusion: dto.conclusion,
        notes: dto.notes,
      },
    });
  }

  async findAll() {
    return this.prisma.changeComplianceRecord.findMany({
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async findByEvent(changeEventId: string) {
    return this.prisma.changeComplianceRecord.findMany({
      where: { change_event_id: changeEventId },
      orderBy: { created_at: 'desc' },
    });
  }

  async remove(id: string) {
    return this.prisma.changeComplianceRecord.delete({ where: { id } });
  }
}
