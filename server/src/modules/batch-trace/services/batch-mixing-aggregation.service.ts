import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateBatchMixingAggregationDto,
  ConfirmBatchMixingAggregationDto,
} from '../dto/batch-mixing-aggregation.dto';

@Injectable()
export class BatchMixingAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBatchMixingAggregationDto) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.productionBatchId },
    });
    if (!productionBatch) {
      throw new BadRequestException('产品批次不存在');
    }

    if (!productionBatch.recipeId) {
      throw new BadRequestException('产品批次缺少配方，无法归集配料执行');
    }

    const confirmedExecutions = await this.prisma.mixingExecution.findMany({
      where: {
        id: { in: dto.mixingExecutionIds },
        status: 'confirmed',
      },
    });

    if (confirmedExecutions.length !== dto.mixingExecutionIds.length) {
      throw new BadRequestException('存在未确认或不存在的配料执行');
    }

    const mismatch = confirmedExecutions.find(
      (exec) =>
        exec.productId !== productionBatch.productId ||
        exec.recipeId !== productionBatch.recipeId,
    );
    if (mismatch) {
      throw new BadRequestException('配料执行与产品批次的产品或配方不一致');
    }

    const upsertOps = dto.mixingExecutionIds.map((mixingExecutionId) =>
      this.prisma.batchMixingAggregation.upsert({
        where: {
          productionBatchId_mixingExecutionId: {
            productionBatchId: dto.productionBatchId,
            mixingExecutionId,
          },
        },
        create: {
          productionBatchId: dto.productionBatchId,
          mixingExecutionId,
          status: 'draft',
          note: dto.note,
        },
        update: {
          note: dto.note,
        },
      }),
    );

    return this.prisma.$transaction(upsertOps);
  }

  async confirm(dto: ConfirmBatchMixingAggregationDto) {
    const result = await this.prisma.batchMixingAggregation.updateMany({
      where: { productionBatchId: dto.productionBatchId },
      data: {
        status: 'confirmed',
        confirmedBy: dto.confirmedBy,
        confirmedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('产品批次尚未归集配料执行');
    }

    return this.findByProductBatch(dto.productionBatchId);
  }

  findByProductBatch(productionBatchId: string) {
    return this.prisma.batchMixingAggregation.findMany({
      where: { productionBatchId },
      include: {
        mixingExecution: {
          include: {
            lines: {
              include: {
                materialBatch: true,
                material: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
