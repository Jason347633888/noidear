import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryMaterialBalanceDto } from './dto/query-material-balance.dto';

type BalanceStatus = 'normal' | 'minor' | 'important' | 'high';

function gradeStatus(absDiff: number): BalanceStatus {
  if (absDiff === 0) return 'normal';
  if (absDiff < 2) return 'minor';
  if (absDiff < 10) return 'important';
  return 'high';
}

@Injectable()
export class TraceabilityBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(dto: QueryMaterialBalanceDto, _currentUser: any) {
    const batch = dto.productionBatchId
      ? await this.prisma.productionBatch.findUnique({
          where: { id: dto.productionBatchId },
          include: {
            materialUsages: { include: { materialBatch: { include: { material: true } } } },
          },
        })
      : null;

    if (!batch) {
      return { summary: { status: 'normal', message: 'No matching batch' }, rows: [], recommendations: [] };
    }

    const totalInput = batch.materialUsages.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);
    const totalOutput =
      Number(batch.output_qty ?? 0) +
      Number(batch.loss_qty ?? 0) +
      Number(batch.sample_qty ?? 0) +
      Number(batch.waste_qty ?? 0);
    const diffQty = totalInput - totalOutput;
    const status = gradeStatus(Math.abs(diffQty));

    const rows = batch.materialUsages.map((item: any) => ({
      materialId: item.materialBatch.material.id,
      materialName: item.materialBatch.material.name,
      inputQty: Number(item.quantity),
      outputQty: Number(batch.output_qty ?? 0),
      lossQty: Number(batch.loss_qty ?? 0),
      diffQty,
      riskLevel: status,
    }));

    const recommendations =
      status === 'high' || status === 'important'
        ? ['createDeviation', 'openTraceQuery']
        : status === 'minor'
          ? ['openTraceQuery']
          : [];

    return {
      summary: { status, totalInput, totalOutput, diffQty },
      rows,
      recommendations,
    };
  }
}
