import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVerificationDto } from './dto/create-verification.dto';

@Injectable()
export class VerificationRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async createVerification(capaId: string, dto: CreateVerificationDto, userId: string) {
    const capa = await this.prisma.correctiveAction.findFirst({
      where: { id: capaId, company_id: '1' },
    });
    if (!capa) throw new NotFoundException('纠正措施不存在');

    await this.prisma.verificationRecord.create({
      data: {
        company_id: '1',
        corrective_action_id: capaId,
        verified_by: userId,
        verification_method: dto.verification_method,
        result: dto.result,
        notes: dto.notes,
        evidence_record_ids: dto.evidence_record_ids ?? [],
      },
    });

    const newStatus = dto.result === 'effective' ? 'closed' : 'implementing';
    return this.prisma.correctiveAction.update({
      where: { id: capaId },
      data: {
        status: newStatus,
        ...(newStatus === 'closed' ? { closed_at: new Date() } : {}),
      },
    });
  }

  async listVerifications(capaId: string) {
    return this.prisma.verificationRecord.findMany({
      where: { corrective_action_id: capaId },
      orderBy: { created_at: 'desc' },
    });
  }
}
