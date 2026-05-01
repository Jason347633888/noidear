import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMaterialUsageDto } from '../dto/material-usage.dto';

@Injectable()
export class MaterialUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialUsageDto) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.productionBatchId },
    });
    if (!productionBatch) {
      throw new NotFoundException('生产批次不存在');
    }
    if (!productionBatch.recipeId) {
      throw new BadRequestException('生产批次未关联配方');
    }

    const recipeLine = await this.prisma.recipeLine.findFirst({
      where: { id: dto.recipeLineId, recipe_id: productionBatch.recipeId },
    });
    if (!recipeLine) {
      throw new BadRequestException('配方明细不存在或不属于该生产批次配方');
    }

    const materialBatch = await this.prisma.materialBatch.findUnique({
      where: { id: dto.materialBatchId },
    });
    if (!materialBatch) {
      throw new NotFoundException('原料批次不存在');
    }
    if (materialBatch.materialId !== recipeLine.material_id) {
      throw new BadRequestException('物料批次对应物料与配方明细不一致');
    }
    if (materialBatch.status !== 'normal') {
      throw new BadRequestException('原料批次状态不可用，仅允许投料 normal 状态批次');
    }
    if (materialBatch.quantity < dto.quantity) {
      throw new BadRequestException('原料批次库存不足');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const usage = await tx.batchMaterialUsage.create({
        data: {
          productionBatchId: dto.productionBatchId,
          materialBatchId: dto.materialBatchId,
          recipeLineId: dto.recipeLineId,
          area_id: recipeLine.area_id,
          areaNameSnapshot: recipeLine.area_name_snapshot,
          quantity: dto.quantity,
        },
      });

      await tx.materialBatch.update({
        where: { id: dto.materialBatchId },
        data: { quantity: { decrement: dto.quantity } },
      });

      return usage;
    });
  }

  async findByProductionBatch(productionBatchId: string) {
    return this.prisma.batchMaterialUsage.findMany({
      where: { productionBatchId },
      include: {
        materialBatch: {
          include: { material: true, supplier: true },
        },
        productionBatch: true,
      },
    });
  }

  async remove(id: string) {
    const usage = await this.prisma.batchMaterialUsage.findUnique({
      where: { id },
    });

    if (!usage) {
      throw new NotFoundException('关联记录不存在');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.materialBatch.update({
        where: { id: usage.materialBatchId },
        data: { quantity: { increment: usage.quantity } },
      });

      await tx.batchMaterialUsage.delete({ where: { id } });
    });
  }
}
