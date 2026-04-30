import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecommendMaterialBatchDto,
  CreateMixingExecutionDto,
} from './dto/mixing.dto';

@Injectable()
export class MixingService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendMaterialBatches(dto: RecommendMaterialBatchDto) {
    const stocks = await this.prisma.stagingAreaStock.findMany({
      where: {
        area_id: dto.areaId,
        quantity: { gt: 0 },
        batch: { materialId: dto.materialId },
      },
      include: { batch: true },
      orderBy: [
        { batch: { productionDate: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    let remaining = dto.requiredQuantity;
    const recommendations: Array<{
      stagingAreaStockId: string;
      materialBatchId: string;
      quantity: number;
      availableQuantity: number;
    }> = [];

    for (const stock of stocks) {
      if (remaining <= 0) break;
      const quantity = Math.min(stock.quantity, remaining);
      recommendations.push({
        stagingAreaStockId: stock.id,
        materialBatchId: stock.batchId,
        quantity,
        availableQuantity: stock.quantity,
      });
      remaining -= quantity;
    }

    return { recommendations, shortage: remaining };
  }

  private async generateExecutionNo(tx: any): Promise<string> {
    const count = await tx.mixingExecution.count();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `MIX-${date}-${String(count + 1).padStart(4, '0')}`;
  }

  async createExecution(dto: CreateMixingExecutionDto) {
    const recipeLineIds = dto.lines.map((l) => l.recipeLineId);
    if (new Set(recipeLineIds).size !== recipeLineIds.length) {
      throw new BadRequestException('配方明细存在重复项');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const recipeLines = await tx.recipeLine.findMany({
          where: { recipe_id: dto.recipeId },
        });
        const recipeLineById = new Map(recipeLines.map((line) => [line.id, line]));

        const execution = await tx.mixingExecution.create({
          data: {
            executionNo: await this.generateExecutionNo(tx),
            recipeId: dto.recipeId,
            productId: dto.productId,
            area_id: dto.areaId,
            work_date: new Date(dto.workDate),
            actual_weight: dto.actualWeight,
            status: 'confirmed',
            confirmedAt: new Date(),
          },
        });

        for (const input of dto.lines) {
          const recipeLine = recipeLineById.get(input.recipeLineId);
          if (!recipeLine) {
            throw new BadRequestException('配方明细不存在');
          }

          const stock = await tx.stagingAreaStock.findFirst({
            where: {
              area_id: dto.areaId,
              batchId: input.materialBatchId,
              quantity: { gte: input.actualQuantity },
            },
            include: { batch: true },
          });
          if (!stock) {
            throw new BadRequestException('配料区库存不足');
          }
          if (stock.batch.materialId !== recipeLine.material_id) {
            throw new BadRequestException('原辅料批次与配方物料不一致');
          }

          await tx.stagingAreaStock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: input.actualQuantity } },
          });

          await tx.mixingExecutionLine.create({
            data: {
              executionId: execution.id,
              recipeLineId: input.recipeLineId,
              materialId: recipeLine.material_id,
              materialBatchId: input.materialBatchId,
              stagingAreaStockId: stock.id,
              plannedQuantity: Number(recipeLine.qty_per_batch),
              actualQuantity: input.actualQuantity,
              fifoSuggested: !input.manualOverride,
              manualOverride: input.manualOverride,
              overrideReason: input.overrideReason,
            },
          });
        }

        return tx.mixingExecution.findUnique({
          where: { id: execution.id },
          include: { lines: true },
        });
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('执行号生成冲突，请重试');
      }
      throw error;
    }
  }
}
