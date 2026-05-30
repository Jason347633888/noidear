import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
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

const FINISHED_PRODUCT_TYPE = 'finished_product';

export interface ReleaseBlocker {
  code: string;
  message: string;
  resourceType: string;
  resourceId: string;
}

export interface ReleaseReadiness {
  ready: boolean;
  blockers: ReleaseBlocker[];
}

@Injectable()
export class ProductionBatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batchNumberGenerator: BatchNumberGeneratorService,
  ) {}

  async create(createDto: CreateProductionBatchDto, creatorId?: string) {
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
        ...(creatorId !== undefined ? { leader_id: creatorId } : {}),
      },
    });
  }

  async findAll(query: QueryProductionBatchDto, ownership?: OwnershipContext) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(status, search);

    // Ownership scoping — ProductionBatch.leader_id is the user FK
    if (ownership && ownership.roleCode !== 'admin') {
      if (ownership.roleCode === 'user') {
        where['leader_id'] = ownership.userId;
      } else if (ownership.roleCode === 'leader') {
        const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
        if (memberIds.length === 0) return { data: [], total: 0, page, limit };
        where['leader_id'] = { in: memberIds };
      }
    }

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

  async confirmProductBatch(dto: ConfirmProductBatchDto, creatorId?: string) {
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
          // Task 6: "confirm" means the batch number has STARTED, not finished.
          // Batch-close / finished-goods intake is owned by Task 9.
          status: 'in_progress',
          ...(creatorId !== undefined ? { leader_id: creatorId } : {}),
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

  async getReleaseReadiness(
    productionBatchId: string,
    prismaClient?: PrismaClient | Prisma.TransactionClient,
  ): Promise<ReleaseReadiness> {
    const client = prismaClient ?? this.prisma;

    const batch = await client.productionBatch.findUnique({
      where: { id: productionBatchId },
      include: { product: { select: { id: true, product_type: true, company_id: true } } },
    });

    if (!batch || batch.deletedAt) {
      throw new NotFoundException('Production batch not found');
    }

    const companyId = batch.product?.company_id;
    const blockers: ReleaseBlocker[] = [];

    // Only count submitted inspection records — drafts do not satisfy the gate.
    const inspectionRecords = await client.inspectionRecord.findMany({
      where: {
        ...(companyId ? { company_id: companyId } : {}),
        object_type: 'production_batch',
        object_id: productionBatchId,
        status: 'submitted',
      },
      include: {
        items: {
          include: { inspection_item: { select: { id: true, is_critical: true } } },
        },
      },
    });

    if (inspectionRecords.length === 0) {
      blockers.push({
        code: 'missing_product_inspection',
        message: '缺少成品检验记录',
        resourceType: 'production_batch',
        resourceId: productionBatchId,
      });
    }

    for (const record of inspectionRecords) {
      for (const item of record.items) {
        if (item.judgment === 'fail' && item.inspection_item?.is_critical) {
          blockers.push({
            code: 'failed_safety_critical_inspection',
            message: `安全关键检验项目不合格，不可让步放行（检验记录 ${record.id}）`,
            resourceType: 'inspection_record',
            resourceId: record.id,
          });
        }
      }
    }

    const hasCriticalFailure = blockers.some(b => b.code === 'failed_safety_critical_inspection');

    // Query NCs that are not yet closed — 'open' (undisposed) and 'dispositioned' both
    // represent unresolved non-conformances. The dispose() flow always moves status from
    // 'open' → 'dispositioned', so a concession NC will always be 'dispositioned'.
    const unresolvedNCs = await client.nonConformance.findMany({
      where: {
        ...(companyId ? { company_id: companyId } : {}),
        source_type: 'production_batch',
        source_id: productionBatchId,
        status: { in: ['open', 'dispositioned'] },
      },
    });

    for (const nc of unresolvedNCs) {
      if (!nc.disposition) {
        blockers.push({
          code: 'open_non_conformance_without_disposition',
          message: `不合格品尚未处置（NC ${nc.nc_no}）`,
          resourceType: 'non_conformance',
          resourceId: nc.id,
        });
        continue;
      }

      if (nc.disposition !== 'concession') {
        blockers.push({
          code: 'non_conformance_disposition_not_concession',
          message: `不合格品处置方式为"${nc.disposition}"，不满足让步放行条件（NC ${nc.nc_no}）`,
          resourceType: 'non_conformance',
          resourceId: nc.id,
        });
        continue;
      }

      if (hasCriticalFailure) {
        continue;
      }

      const approvalInstance = await client.approvalInstance.findFirst({
        where: {
          resourceType: 'non_conformance',
          resourceId: nc.id,
          status: 'APPROVED',
        },
      });

      if (!approvalInstance) {
        blockers.push({
          code: 'concession_without_approved_approval_instance',
          message: `让步处置未获批准（NC ${nc.nc_no}）`,
          resourceType: 'non_conformance',
          resourceId: nc.id,
        });
      }
    }

    const isFinishedProduct = batch.product?.product_type === FINISHED_PRODUCT_TYPE;
    if (isFinishedProduct) {
      const retainedSample = await client.retainedSample.findFirst({
        where: {
          ...(companyId ? { company_id: companyId } : {}),
          production_batch_id: productionBatchId,
        },
      });

      if (!retainedSample) {
        blockers.push({
          code: 'missing_retained_sample',
          message: '成品批次缺少留样记录',
          resourceType: 'production_batch',
          resourceId: productionBatchId,
        });
      }
    }

    return { ready: blockers.length === 0, blockers };
  }

  async releaseProductionBatch(productionBatchId: string, releasedBy: string) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({
        where: { id: productionBatchId },
        select: { id: true, released_at: true, deletedAt: true },
      });

      if (!batch || batch.deletedAt) {
        throw new NotFoundException('Production batch not found');
      }

      if (batch.released_at) {
        throw new ConflictException('批次已放行，不可重复操作');
      }

      // Re-check readiness inside the transaction to close the TOCTOU window.
      const readiness = await this.getReleaseReadiness(productionBatchId, tx);

      if (!readiness.ready) {
        throw new BadRequestException({
          message: '批次放行检查未通过',
          blockers: readiness.blockers,
        });
      }

      return tx.productionBatch.update({
        where: { id: productionBatchId },
        data: {
          released_at: new Date(),
          released_by_id: releasedBy,
        },
      });
    });
  }
}
