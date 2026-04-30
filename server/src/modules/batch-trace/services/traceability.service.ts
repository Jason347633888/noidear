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

  async traceProductionBatch(productionBatchId: string) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
      include: {
        aggregations: {
          include: {
            mixingExecution: {
              include: {
                area: true,
                lines: {
                  include: {
                    material: true,
                    materialBatch: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!productionBatch) {
      throw new NotFoundException('产品批次不存在');
    }

    const nodes: Array<{ id: string; type: string; label: string }> = [
      {
        id: productionBatch.id,
        type: 'productionBatch',
        label: (productionBatch as any).batchNumber ?? productionBatch.id,
      },
    ];

    const edges: Array<{ source: string; target: string; relation: string }> = [];

    for (const aggregation of (productionBatch as any).aggregations ?? []) {
      const execution = aggregation.mixingExecution;
      if (!execution) continue;

      nodes.push({
        id: execution.id,
        type: 'mixingExecution',
        label: execution.executionNo ?? execution.id,
      });

      edges.push({
        source: productionBatch.id,
        target: execution.id,
        relation: 'aggregation',
      });

      for (const line of execution.lines ?? []) {
        const materialBatch = line.materialBatch;
        if (!materialBatch) continue;

        nodes.push({
          id: materialBatch.id,
          type: 'materialBatch',
          label: (materialBatch as any).batchNumber ?? materialBatch.id,
        });

        edges.push({
          source: execution.id,
          target: materialBatch.id,
          relation: 'ingredient',
        });
      }
    }

    return { nodes, edges };
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
