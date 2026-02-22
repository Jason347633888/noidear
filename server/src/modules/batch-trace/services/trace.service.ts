import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TraceService {
  constructor(private readonly prisma: PrismaService) {}

  async backwardTrace(finishedGoodsBatchId: string) {
    const finishedGoods = await this.prisma.finishedGoodsBatch.findUnique({
      where: { id: finishedGoodsBatchId },
      include: {
        productionBatch: {
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
        },
      },
    });

    if (!finishedGoods) {
      throw new Error('Finished goods batch not found');
    }

    return {
      finishedGoods: {
        id: finishedGoods.id,
        batchNumber: finishedGoods.batchNumber,
      },
      productionBatch: {
        id: finishedGoods.productionBatch.id,
        batchNumber: finishedGoods.productionBatch.batchNumber,
      },
      rawMaterials: finishedGoods.productionBatch.materialUsages.map((usage) => ({
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
            productionBatch: {
              include: {
                finishedGoods: true,
              },
            },
          },
        },
      },
    });

    const productionBatches = [];
    const finishedGoods = [];

    for (const batch of materialBatches) {
      for (const usage of batch.batchMaterialUsages) {
        productionBatches.push({
          id: usage.productionBatch.id,
          batchNumber: usage.productionBatch.batchNumber,
        });

        for (const fg of usage.productionBatch.finishedGoods) {
          finishedGoods.push({
            id: fg.id,
            batchNumber: fg.batchNumber,
            shippedTo: fg.shippedTo,
          });
        }
      }
    }

    return {
      productionBatches,
      finishedGoods,
    };
  }
}
