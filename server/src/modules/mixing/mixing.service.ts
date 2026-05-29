import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RecommendMaterialBatchDto,
  CreateMixingExecutionDto,
  ListMixingExecutionsDto,
} from './dto/mixing.dto';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

@Injectable()
export class MixingService {
  constructor(private readonly prisma: PrismaService) {}

  async listExecutions(dto: ListMixingExecutionsDto, ownership: OwnershipContext) {
    const ownershipWhere = await this.buildOwnershipWhere(ownership);
    return this.prisma.mixingExecution.findMany({
      where: {
        ...(dto.productId && { productId: dto.productId }),
        ...(dto.recipeId && { recipeId: dto.recipeId }),
        ...(dto.areaId && { area_id: dto.areaId }),
        ...(dto.status && { status: dto.status as any }),
        ...(dto.shiftTypeId && { shift_type_id: dto.shiftTypeId }),
        ...(dto.dateFrom || dto.dateTo
          ? {
              work_date: {
                ...(dto.dateFrom && { gte: new Date(dto.dateFrom) }),
                ...(dto.dateTo && { lte: new Date(dto.dateTo) }),
              },
            }
          : {}),
        ...ownershipWhere,
      },
      include: {
        area: true,
        shift_type: true,
        lines: { include: { material: true, materialBatch: true } },
      },
      orderBy: { work_date: 'desc' },
      take: 100,
    });
  }

  private async buildOwnershipWhere(ownership: OwnershipContext): Promise<Record<string, unknown>> {
    if (ownership.roleCode === 'admin') return {};
    if (ownership.roleCode === 'user') {
      return { operatorId: ownership.userId };
    }
    // leader
    const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
    if (memberIds.length === 0) return { id: 'no-match' };
    return { operatorId: { in: memberIds } };
  }

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

  private async generateExecutionNo(tx: any, workDate: Date): Promise<string> {
    const date = workDate.toISOString().slice(0, 10).replace(/-/g, '');
    const dayStart = new Date(`${workDate.toISOString().slice(0, 10)}T00:00:00.000Z`);
    const dayEnd = new Date(`${workDate.toISOString().slice(0, 10)}T23:59:59.999Z`);
    const count = await tx.mixingExecution.count({
      where: { work_date: { gte: dayStart, lte: dayEnd } },
    });
    return `MIX-${date}-${String(count + 1).padStart(4, '0')}`;
  }

  async createExecution(dto: CreateMixingExecutionDto, operatorId?: string) {
    const recipeLineIds = dto.lines.map((l) => l.recipeLineId);
    if (new Set(recipeLineIds).size !== recipeLineIds.length) {
      throw new BadRequestException('配方明细存在重复项');
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this._doCreateExecution(dto, operatorId);
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002' && attempt < 2) {
          continue;
        }
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('执行号生成冲突，请重试');
        }
        throw error;
      }
    }
    throw new ConflictException('执行号生成冲突，请重试');
  }

  private async _doCreateExecution(dto: CreateMixingExecutionDto, operatorId?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const recipe = await tx.recipe.findFirst({
          where: { id: dto.recipeId, product_id: dto.productId, status: 'active' },
        });
        if (!recipe) {
          throw new BadRequestException('配方与产品不匹配或配方未启用');
        }

        if (dto.shiftTypeId) {
          const shiftType = await tx.shiftType.findFirst({
            where: { id: dto.shiftTypeId, active: true },
            select: { id: true },
          });
          if (!shiftType) {
            throw new BadRequestException('班次类型不存在或已停用');
          }
        }

        if (dto.shiftTypeId) {
          const uniqueBatchIds = [...new Set(dto.lines.map((l) => l.materialBatchId))];
          for (const batchId of uniqueBatchIds) {
            const stocktake = await tx.stagingAreaStocktake.findFirst({
              where: {
                area_id: dto.areaId,
                batchId,
                kind: 'shift_start',
                work_date: new Date(dto.workDate),
                shift_type_id: dto.shiftTypeId,
                status: { in: ['confirmed', 'exception'] },
              },
              select: { id: true },
            });
            if (!stocktake) {
              throw new BadRequestException(`物料批次 ${batchId} 缺少班前盘点，请先完成班前盘点再执行配料`);
            }
          }
        }

        const recipeLines = await tx.recipeLine.findMany({
          where: { recipe_id: dto.recipeId },
        });
        const recipeLineById = new Map(recipeLines.map((line) => [line.id, line]));

        const execution = await tx.mixingExecution.create({
          data: {
            executionNo: await this.generateExecutionNo(tx, new Date(dto.workDate)),
            recipeId: dto.recipeId,
            productId: dto.productId,
            area_id: dto.areaId,
            shift_type_id: dto.shiftTypeId,
            work_date: new Date(dto.workDate),
            actual_weight: dto.actualWeight,
            status: 'confirmed',
            confirmedAt: new Date(),
            ...(operatorId !== undefined ? { operatorId } : {}),
          },
        });

        for (const input of dto.lines) {
          const recipeLine = recipeLineById.get(input.recipeLineId);
          if (!recipeLine) {
            throw new BadRequestException('配方明细不存在');
          }

          const stock = await tx.stagingAreaStock.findFirst({
            where: { area_id: dto.areaId, batchId: input.materialBatchId },
            include: { batch: true },
          });
          if (!stock) {
            throw new BadRequestException('配料区无该原辅料批次');
          }
          if (stock.batch.materialId !== recipeLine.material_id) {
            throw new BadRequestException('原辅料批次与配方物料不一致');
          }

          // Atomic conditional decrement: prevents two concurrent transactions from
          // both passing a quantity check and overdrawing the stock.
          const decrement = await tx.stagingAreaStock.updateMany({
            where: { id: stock.id, quantity: { gte: input.actualQuantity } },
            data: { quantity: { decrement: input.actualQuantity } },
          });
          if (decrement.count !== 1) {
            throw new BadRequestException('配料区库存不足或已被并发占用');
          }

          // Future trace bridge: once MixingExecution gains a ProductionBatch
          // link, call BatchMaterialUsageService.createFromMixingLine here with
          // the created line's id so the traceability chain is auto-generated.
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
          include: { shift_type: true, lines: true },
        });
      });
    } catch (error) {
      throw error;
    }
  }
}
