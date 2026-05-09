import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';

@Injectable()
export class SupplierEvaluationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEvaluationDto, companyId: string) {
    const total_score =
      dto.quality_score != null &&
      dto.delivery_score != null &&
      dto.service_score != null
        ? (dto.quality_score + dto.delivery_score + dto.service_score) / 3
        : undefined;

    const evaluation = await this.prisma.supplierEvaluation.create({
      data: {
        company_id: companyId,
        supplier_id: dto.supplier_id,
        eval_period: dto.eval_period,
        eval_date: new Date(),
        quality_score: dto.quality_score,
        delivery_score: dto.delivery_score,
        service_score: dto.service_score,
        total_score,
        verdict: dto.verdict,
        notes: dto.notes,
      },
    });

    // 评估结果联动更新供应商状态
    await this.prisma.supplier.update({
      where: { id: dto.supplier_id },
      data: {
        evaluationStatus:
          dto.verdict === 'eliminated'
            ? 'eliminated'
            : dto.verdict === 'conditional'
              ? 'suspended'
              : 'approved',
        last_evaluated_at: new Date(),
      },
    });

    return evaluation;
  }

  async findBySupplier(supplierId: string, companyId: string) {
    return this.prisma.supplierEvaluation.findMany({
      where: { supplier_id: supplierId, company_id: companyId },
      orderBy: { eval_date: 'desc' },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.supplierEvaluation.findMany({
      where: { company_id: companyId },
      include: { supplier: true },
      orderBy: { eval_date: 'desc' },
      take: 100,
    });
  }
}
