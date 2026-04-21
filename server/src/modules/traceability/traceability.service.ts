import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TraceabilityService {
  constructor(private prisma: PrismaService) {}

  // 正向追溯：原料批次 → 使用它的生产批次 → 发货 → 客户
  async forwardTrace(materialBatchId: string) {
    const materialBatch = await this.prisma.materialBatch.findUnique({
      where: { id: materialBatchId },
      include: {
        material: true,
        supplier: true,
        incoming_inspections: { include: { results: true } },
        batchMaterialUsages: {
          include: {
            productionBatch: {
              include: {
                delivery_notes: true,
                finishedGoods: true,
              },
            },
          },
        },
      },
    });

    return { material_batch: materialBatch };
  }

  // 反向追溯：生产批次 → 所有原料批次 → 供应商
  async backwardTrace(productionBatchId: string) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
      include: {
        delivery_notes: true,
        ccp_records: true,
        materialUsages: {
          include: {
            materialBatch: {
              include: {
                material: true,
                supplier: true,
                incoming_inspections: { include: { results: true } },
              },
            },
          },
        },
      },
    });

    return { production_batch: productionBatch };
  }

  // 物料平衡：投入量 vs 产出量 + 损耗 + 留样 + 废弃
  async materialBalance(productionBatchId: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
      include: {
        samples: true,
        materialUsages: {
          include: { materialBatch: { include: { material: true } } },
        },
      },
    });

    if (!batch) return null;

    const output = Number(batch.output_qty ?? 0);
    const loss = Number(batch.loss_qty ?? 0);
    const sample = Number(batch.sample_qty ?? 0);
    const waste = Number(batch.waste_qty ?? 0);

    const totalInput = batch.materialUsages.reduce(
      (sum, u) => sum + Number(u.quantity),
      0,
    );

    return {
      production_batch: batch,
      total_input: totalInput,
      output,
      loss,
      sample,
      waste,
      total_accounted: output + loss + sample + waste,
      balance_diff: totalInput - (output + loss + sample + waste),
    };
  }
}
