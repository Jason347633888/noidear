import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExternalPartyEvaluationDto } from './dto/create-external-party-evaluation.dto';

export const EXTERNAL_PARTY_EVALUATION_TYPES = [
  'contractor_food_safety',
  'logistics',
  'outsourced_service',
  'other',
] as const;

@Injectable()
export class ExternalPartyEvaluationService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateExternalPartyEvaluationDto) {
    if (!EXTERNAL_PARTY_EVALUATION_TYPES.includes(dto.evaluation_type as any)) {
      throw new BadRequestException(
        `无效的评价类型，允许值: ${EXTERNAL_PARTY_EVALUATION_TYPES.join(', ')}`,
      );
    }

    const party = await this.prisma.externalParty.findFirst({
      where: { id: dto.external_party_id, company_id: companyId, deleted_at: null },
    });

    if (!party) {
      throw new NotFoundException('外部方不存在或不属于当前公司');
    }

    return this.prisma.externalPartyEvaluation.create({
      data: {
        company_id: companyId,
        external_party_id: dto.external_party_id,
        evaluation_type: dto.evaluation_type,
        evaluation_date: new Date(dto.evaluation_date),
        score: dto.score ?? null,
        result: dto.result,
        risk_level: dto.risk_level ?? null,
        evaluator_id: dto.evaluator_id ?? null,
        evidence_file_id: dto.evidence_file_id ?? null,
        next_review_at: dto.next_review_at ? new Date(dto.next_review_at) : null,
      },
    });
  }

  async findByParty(externalPartyId: string, companyId: string) {
    return this.prisma.externalPartyEvaluation.findMany({
      where: { external_party_id: externalPartyId, company_id: companyId },
      orderBy: { evaluation_date: 'desc' },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.externalPartyEvaluation.findMany({
      where: { company_id: companyId },
      orderBy: { evaluation_date: 'desc' },
      take: 200,
    });
  }
}
