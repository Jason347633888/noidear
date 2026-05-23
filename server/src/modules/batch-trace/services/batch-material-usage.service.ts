import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OwnershipContext } from '../../module-access/ownership-context';
import { visibleProductionBatchIds } from '../../module-access/ownership-helpers';

interface CreateBatchMaterialUsageDto {
  productionBatchId: string;
  materialBatchId: string;
  recipeLineId: string;
  quantity: number;
}

@Injectable()
export class BatchMaterialUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async listForOwnership(ownership: OwnershipContext) {
    const batchIds = await visibleProductionBatchIds(this.prisma, ownership);
    if (batchIds !== undefined && batchIds.length === 0) return [];
    const where: Record<string, unknown> = batchIds !== undefined
      ? { productionBatchId: { in: batchIds } }
      : {};
    return this.prisma.batchMaterialUsage.findMany({
      where,
      orderBy: { usedAt: 'desc' },
    });
  }

  async create(createDto: CreateBatchMaterialUsageDto) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: createDto.productionBatchId },
    });
    if (!batch) throw new NotFoundException('生产批次不存在');
    if (!batch.recipeId) throw new BadRequestException('生产批次未关联配方');

    const recipeLine = await this.prisma.recipeLine.findFirst({
      where: { id: createDto.recipeLineId, recipe_id: batch.recipeId },
    });
    if (!recipeLine) throw new BadRequestException('配方明细不存在或不属于该生产批次配方');

    const materialBatch = await this.prisma.materialBatch.findUnique({
      where: { id: createDto.materialBatchId },
    });
    if (!materialBatch) throw new NotFoundException('物料批次不存在');
    if (materialBatch.materialId !== recipeLine.material_id) {
      throw new BadRequestException('物料批次对应物料与配方明细不一致');
    }

    return this.prisma.batchMaterialUsage.create({
      data: {
        productionBatchId: createDto.productionBatchId,
        materialBatchId: createDto.materialBatchId,
        recipeLineId: createDto.recipeLineId,
        area_id: recipeLine.area_id,
        areaNameSnapshot: recipeLine.area_name_snapshot,
        quantity: createDto.quantity,
      },
    });
  }

  async getProductionBatchMaterials(productionBatchId: string) {
    return this.prisma.batchMaterialUsage.findMany({
      where: { productionBatchId },
      include: {
        materialBatch: {
          include: {
            material: true,
            supplier: true,
          },
        },
      },
      orderBy: { usedAt: 'asc' },
    });
  }

  async getMaterialBatchUsages(materialBatchId: string) {
    return this.prisma.batchMaterialUsage.findMany({
      where: { materialBatchId },
      include: {
        productionBatch: true,
        materialBatch: {
          include: {
            material: true,
            supplier: true,
          },
        },
      },
      orderBy: { usedAt: 'asc' },
    });
  }
}
