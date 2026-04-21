import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChangeVerificationRecordDto } from './dto/create-change-verification-record.dto';

@Injectable()
export class ChangeVerificationRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChangeVerificationRecordDto, userId: string) {
    return this.prisma.changeVerificationRecord.create({
      data: {
        company_id: '1',
        change_event_id: dto.change_event_id,
        verified_by: dto.verifier_id ?? userId,
        verification_plan: dto.verification_method ?? '',
        verification_result: dto.result ?? '',
        verdict: dto.result ?? '',
        approved_by: undefined,
        verified_at: new Date(),
      },
    });
  }

  async findAll() {
    return this.prisma.changeVerificationRecord.findMany({
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async findByEvent(changeEventId: string) {
    return this.prisma.changeVerificationRecord.findMany({
      where: { change_event_id: changeEventId },
      orderBy: { created_at: 'desc' },
    });
  }

  async remove(id: string) {
    return this.prisma.changeVerificationRecord.delete({ where: { id } });
  }
}
