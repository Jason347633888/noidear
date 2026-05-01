import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TraceabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // TASK-9: traceBackward now accepts a productionBatchId directly.
  // Legacy finishedGoodsBatchId callers should migrate to productionBatchId.
  async traceBackward(productionBatchId: string) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
    });

    if (!productionBatch) {
      throw new NotFoundException('产品批次不存在');
    }

    const materialUsages = await this.prisma.batchMaterialUsage.findMany({
      where: { productionBatchId },
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
      where: { productionBatchId },
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
      productionBatch,
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
                aggregations: {
                  include: {
                    productionBatch: {
                      select: { id: true, batchNumber: true },
                    },
                  },
                  orderBy: { createdAt: 'asc' },
                },
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

      const linkedBatchCount = execution.aggregations?.length ?? 0;

      edges.push({
        source: productionBatch.id,
        target: execution.id,
        relation: linkedBatchCount > 1 ? 'sharedAggregation' : 'aggregation',
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

    // TASK-9: finishedGoodsBatch removed — query records directly via productionBatchId
    // TASK-169: 查询关联的动态表单记录
    const relatedRecords = await this.prisma.record.findMany({
      where: { productionBatchId: { in: productionBatchIds } },
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
      productionBatches: usages.map((u) => ({
        id: u.productionBatch.id,
        batchNumber: u.productionBatch.batchNumber,
        status: u.productionBatch.status,
        productionDate: u.productionBatch.productionDate,
        usedQuantity: u.quantity,
        usedAt: u.usedAt,
        // TASK-9: finishedGoods field removed from forward trace result
      })),
      relatedRecords, // TASK-169: 包含关联的动态表单记录
      traceTime: new Date(),
    };
  }
}
