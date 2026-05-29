import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OwnershipContext } from '../../module-access/ownership-context';
import { visibleProductionBatchIds } from '../../module-access/ownership-helpers';

interface CreateBatchMaterialUsageDto {
  productionBatchId: string;
  materialBatchId: string;
  recipeLineId: string;
  quantity: number;
}

interface CreateFromMixingLineDto {
  productionBatchId: string;
  materialBatchId: string;
  quantity: number;
  executionLineId: string;
  recipeLineId?: string;
  area_id?: string;
  areaNameSnapshot?: string;
}

@Injectable()
export class BatchMaterialUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateBatchMaterialUsageDto, ownership?: OwnershipContext) {
    // C1: Validate productionBatchId ownership to prevent traceability chain pollution.
    if (ownership && ownership.roleCode !== 'admin') {
      const visibleIds = await visibleProductionBatchIds(this.prisma, ownership);
      // visibleIds === undefined means admin (no filter needed), but we already checked roleCode !== 'admin'
      if (visibleIds !== undefined && !visibleIds.includes(createDto.productionBatchId)) {
        throw new ForbiddenException('Production batch not accessible');
      }
    }

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

  /**
   * Internal trace-bridge writer: links a BatchMaterialUsage record to the
   * MixingExecutionLine that produced it. NOT exposed via a public route —
   * called by services (future: MixingExecutionService) to auto-generate the
   * traceability chain. executionLineId is mandatory for every new write so the
   * same material batch can be recorded multiple times across distinct lines.
   */
  async createFromMixingLine(dto: CreateFromMixingLineDto, tx?: Prisma.TransactionClient) {
    if (!dto.executionLineId) {
      throw new BadRequestException('executionLineId is required for new batch material usage');
    }

    const client = tx ?? this.prisma;
    return client.batchMaterialUsage.create({
      data: {
        productionBatchId: dto.productionBatchId,
        materialBatchId: dto.materialBatchId,
        quantity: dto.quantity,
        executionLineId: dto.executionLineId,
        ...(dto.recipeLineId !== undefined ? { recipeLineId: dto.recipeLineId } : {}),
        ...(dto.area_id !== undefined ? { area_id: dto.area_id } : {}),
        ...(dto.areaNameSnapshot !== undefined
          ? { areaNameSnapshot: dto.areaNameSnapshot }
          : {}),
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
