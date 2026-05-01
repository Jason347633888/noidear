import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import { CreateVerificationDto } from './dto/create-verification.dto';

@Injectable()
export class VerificationRecordService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {}

  async createVerification(capaId: string, dto: CreateVerificationDto, userId: string, companyId: string) {
    const capa = await this.prisma.correctiveAction.findFirst({
      where: { id: capaId, company_id: companyId },
    });
    if (!capa) throw new NotFoundException('纠正措施不存在');

    await this.prisma.verificationRecord.create({
      data: {
        company_id: companyId,
        corrective_action_id: capaId,
        verified_by: userId,
        verification_method: dto.verification_method,
        result: dto.result,
        notes: dto.notes,
        evidence_record_ids: dto.evidence_record_ids ?? [],
      },
    });

    const newStatus = dto.result === 'effective' ? 'closed' : 'implementing';
    const updated = await this.prisma.correctiveAction.update({
      where: { id: capaId },
      data: {
        status: newStatus,
        ...(newStatus === 'closed' ? { closed_at: new Date() } : {}),
      },
    });

    try {
      const approval = await this.approvalEngine?.startApproval({
        resourceType: 'corrective_action',
        resourceId: capaId,
        resourceStep: 'verify',
        triggerKey: 'verify',
        title: `CAPA验证审批：${capaId}`,
        createdById: userId,
      });
      if (approval) {
        await this.prisma.correctiveAction.update({ where: { id: capaId }, data: { approvalInstanceId: approval.id } });
      }
    } catch { /* no definition = skip */ }

    return updated;
  }

  async listVerifications(capaId: string, companyId: string) {
    const capa = await this.prisma.correctiveAction.findFirst({
      where: { id: capaId, company_id: companyId },
    });
    if (!capa) throw new NotFoundException('纠正措施不存在');

    return this.prisma.verificationRecord.findMany({
      where: { corrective_action_id: capaId, company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }
}
