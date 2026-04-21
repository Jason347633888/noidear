import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChangeEventDto } from './dto/create-change-event.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';

@Injectable()
export class ChangeEventService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChangeEventDto, userId: string) {
    const count = await this.prisma.changeEvent.count();
    const year = new Date().getFullYear();
    const change_no = `CE-${year}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.changeEvent.create({
      data: {
        company_id: '1',
        change_no,
        change_type: dto.change_type,
        description: dto.description,
        reason: dto.title,
        applied_by: userId,
        applied_at: new Date(),
        status: 'pending',
      },
    });
  }

  async findAll() {
    return this.prisma.changeEvent.findMany({
      include: { verifications: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async approve(id: string, userId: string) {
    return this.prisma.changeEvent.update({
      where: { id },
      data: {
        status: 'approved',
        approved_by: userId,
      },
    });
  }

  async createVerification(dto: CreateVerificationDto, userId: string) {
    return this.prisma.changeVerificationRecord.create({
      data: {
        company_id: '1',
        change_event_id: dto.change_event_id,
        verification_plan: dto.description ?? '',
        verification_result: dto.result,
        verdict: dto.result,
        verified_by: dto.verified_by ?? userId,
        verified_at: new Date(dto.verification_date),
      },
    });
  }

  async findVerifications(changeEventId: string) {
    return this.prisma.changeVerificationRecord.findMany({
      where: { change_event_id: changeEventId },
      orderBy: { created_at: 'desc' },
    });
  }
}
