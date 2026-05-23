import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../prisma/prisma.service';
import { BatchNumberGeneratorService } from './batch-number-generator.service';
import {
  CreateProductionBatchDto,
  UpdateProductionBatchDto,
  QueryProductionBatchDto,
  ConfirmProductBatchDto,
} from '../dto/production-batch.dto';
import { OwnershipContext } from '../../module-access/ownership-context';
import { userIdsInDepts } from '../../module-access/ownership-helpers';

@Injectable()
export class ProductionBatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batchNumberGenerator: BatchNumberGeneratorService,
  ) {}

  async create(createDto: CreateProductionBatchDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: createDto.productId, company_id: '1', status: 'active', deleted_at: null },
    });
    if (!product) throw new BadRequestException('产品不存在或未启用');

    const recipe = await this.prisma.recipe.findFirst({
      where: { id: createDto.recipeId, product_id: createDto.productId, company_id: '1', status: 'active' },
    });
    if (!recipe) throw new BadRequestException('配方不存在、未激活或不属于该产品');

    const batchNumber = await this.batchNumberGenerator.generateBatchNumber('production');

    return this.prisma.productionBatch.create({
      data: {
        batchNumber,
        productId: product.id,
        recipeId: recipe.id,
        // GAP-007: productName is a historical snapshot from Product, never caller input.
        productName: product.name,
        recipeName: `v${recipe.version}`,
        plannedQuantity: createDto.plannedQuantity,
        productionDate: createDto.productionDate,
        status: 'pending',
      },
    });
  }

  /**
   * Ownership-scoped batch list.
   * leader_id links a batch to its responsible person; Team has no departmentId.
   * admin: all; user: leader_id = userId; leader: leader_id IN members(managedDepts)
   */
  async listForOwnership(ownership: OwnershipContext) {
    const where: Record<string, unknown> = {};

    if (ownership.roleCode === 'user') {
      where['leader_id'] = ownership.userId;
    } else if (ownership.roleCode === 'leader') {
      const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
      if (memberIds.length === 0) return [];
      where['leader_id'] = { in: memberIds };
    }
    // admin: no filter

    return this.prisma.productionBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(query: QueryProductionBatchDto) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(status, search);

    const [data, total] = await Promise.all([
      this.prisma.productionBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productionBatch.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private buildWhereClause(status?: string, search?: string) {
    const where: any = { deletedAt: null };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { batchNumber: { contains: search } },
        { productName: { contains: search } },
      ];
    }

    return where;
  }

  async findOne(id: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id },
      include: {
        materialUsages: {
          include: {
            materialBatch: {
              include: { material: true },
            },
          },
        },
        // TASK-9: finishedGoods (FinishedGoodsBatch) removed; use productionBatch directly
        aggregations: {
          include: {
            mixingExecution: {
              include: {
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
                    materialBatch: true,
                    material: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!batch || batch.deletedAt) {
      throw new NotFoundException('Production batch not found');
    }

    return batch;
  }

  async confirmProductBatch(dto: ConfirmProductBatchDto) {
    const existing = await this.prisma.productionBatch.findUnique({
      where: { batchNumber: dto.batchNumber },
    });
    if (existing) {
      throw new ConflictException('产品批次号已存在');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, company_id: '1', status: 'active', deleted_at: null },
    });
    if (!product) {
      throw new BadRequestException('产品不存在');
    }

    const recipe = await this.prisma.recipe.findFirst({
      where: { id: dto.recipeId, product_id: dto.productId, company_id: '1', status: 'active' },
    });
    if (!recipe) {
      throw new BadRequestException('产品配方不存在或未启用');
    }

    try {
      return await this.prisma.productionBatch.create({
        data: {
          batchNumber: dto.batchNumber,
          productId: dto.productId,
          // GAP-007: productName is a historical snapshot from Product, never caller input.
          productName: product.name,
          recipeId: dto.recipeId,
          recipeName: recipe.version_note ?? `v${recipe.version}`,
          actualQuantity: dto.actualQuantity,
          unit: dto.unit,
          productionDate: new Date(dto.productionDate),
          packagedAt: new Date(dto.packagedAt),
          warehousedAt: new Date(dto.warehousedAt),
          packageMachine: dto.packageMachine,
          team_id: dto.teamId,
          shift_type_id: dto.shiftTypeId,
          status: 'completed',
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('产品批次号已存在');
      }
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateProductionBatchDto) {
    await this.findOne(id);

    if ('batchNumber' in updateDto) {
      throw new BadRequestException('Batch number cannot be modified (BR-242)');
    }

    return this.prisma.productionBatch.update({
      where: { id },
      data: updateDto,
    });
  }
}
