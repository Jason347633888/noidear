import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TraceService {
  constructor(private readonly prisma: PrismaService) {}

  // TASK-9: backwardTrace now accepts a productionBatchId directly.
  // The old finishedGoodsBatch model has been removed; ProductionBatch is the canonical batch.
  async backwardTrace(productionBatchId: string) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
      include: {
        materialUsages: {
          include: {
            materialBatch: {
              include: {
                material: true,
                supplier: true,
              },
            },
          },
        },
      },
    });

    if (!productionBatch) {
      throw new NotFoundException('产品批次不存在');
    }

    return {
      productionBatch: {
        id: productionBatch.id,
        batchNumber: productionBatch.batchNumber,
      },
      rawMaterials: productionBatch.materialUsages.map((usage) => ({
        id: usage.materialBatch.id,
        batchNumber: usage.materialBatch.batchNumber,
        materialName: usage.materialBatch.material.name,
        supplierName: usage.materialBatch.supplier?.name,
        quantity: usage.quantity,
      })),
    };
  }

  async forwardTrace(materialBatchId: string) {
    const materialBatches = await this.prisma.materialBatch.findMany({
      where: { id: materialBatchId },
      include: {
        batchMaterialUsages: {
          include: {
            productionBatch: true,
          },
        },
      },
    });

    const productionBatches = [];

    for (const batch of materialBatches) {
      for (const usage of batch.batchMaterialUsages) {
        productionBatches.push({
          id: usage.productionBatch.id,
          batchNumber: usage.productionBatch.batchNumber,
        });
      }
    }

    return {
      productionBatches,
    };
  }
}
