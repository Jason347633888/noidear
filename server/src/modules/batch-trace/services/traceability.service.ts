import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TraceabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async traceBackward(finishedGoodsBatchId: string) {
    const finishedBatch = await this.prisma.finishedGoodsBatch.findUnique({
      where: { id: finishedGoodsBatchId },
      include: {
        productionBatch: true,
      },
    });

    if (!finishedBatch) {
      throw new NotFoundException('成品批次不存在');
    }

    const materialUsages = await this.prisma.batchMaterialUsage.findMany({
      where: { productionBatchId: finishedBatch.productionBatchId },
      include: {
        materialBatch: {
          include: {
            material: true,
            supplier: true,
          },
        },
      },
    });

    // TASK-169: 查询关联的动态表单记录
    const relatedRecords = await this.prisma.record.findMany({
      where: {
        OR: [
          { productionBatchId: finishedBatch.productionBatchId },
          { finishedGoodsBatchId: finishedGoodsBatchId },
        ],
      },
      include: {
        template: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      finishedGoodsBatch: finishedBatch,
      productionBatch: finishedBatch.productionBatch,
      materialBatches: materialUsages.map((u) => ({
        ...u.materialBatch,
        usedQuantity: u.quantity,
        usedAt: u.usedAt,
      })),
      relatedRecords, // TASK-169: 包含关联的动态表单记录
      traceTime: new Date(),
    };
  }

  async traceForward(materialBatchId: string) {
    const materialBatch = await this.prisma.materialBatch.findUnique({
      where: { id: materialBatchId },
      include: {
        material: true,
        supplier: true,
      },
    });

    if (!materialBatch) {
      throw new NotFoundException('原料批次不存在');
    }

    const usages = await this.prisma.batchMaterialUsage.findMany({
      where: { materialBatchId },
      include: {
        productionBatch: true,
      },
    });

    const productionBatchIds = usages.map((u) => u.productionBatchId);
    const finishedGoods = await this.prisma.finishedGoodsBatch.findMany({
      where: { productionBatchId: { in: productionBatchIds } },
    });

    // TASK-169: 查询关联的动态表单记录
    const relatedRecords = await this.prisma.record.findMany({
      where: {
        OR: [
          { productionBatchId: { in: productionBatchIds } },
          {
            finishedGoodsBatchId: {
              in: finishedGoods.map((fg) => fg.id),
            },
          },
        ],
      },
      include: {
        template: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      materialBatch,
      productionBatches: usages.map((u) => {
        const batchFinishedGoods = finishedGoods.filter(
          (fg) => fg.productionBatchId === u.productionBatchId,
        );
        return {
          id: u.productionBatch.id,
          batchNumber: u.productionBatch.batchNumber,
          status: u.productionBatch.status,
          productionDate: u.productionBatch.productionDate,
          usedQuantity: u.quantity,
          usedAt: u.usedAt,
          finishedGoods: batchFinishedGoods,
        };
      }),
      relatedRecords, // TASK-169: 包含关联的动态表单记录
      traceTime: new Date(),
    };
  }
}
