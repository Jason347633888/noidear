import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalEngineService } from '../../unified-approval/approval-engine.service';
import { InventoryMovementLedgerService } from './inventory-movement-ledger.service';
import { Prisma } from '@prisma/client';
import { CreateScrapDto, ApproveScrapDto } from '../dto/scrap.dto';

@Injectable()
export class ScrapService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly approvalEngine: ApprovalEngineService,
    private readonly inventoryMovementLedger: InventoryMovementLedgerService,
  ) {}

  async create(dto: CreateScrapDto) {
    for (const item of dto.items) {
      const batch = await this.prisma.materialBatch.findUnique({
        where: { id: item.materialBatchId },
      });
      if (!batch) {
        throw new NotFoundException(
          `批次 ${item.materialBatchId} 不存在`,
        );
      }
    }

    const scrapNo = await this.generateScrapNumber();

    const materialScrap = await this.prisma.materialScrap.create({
      data: {
        scrapNo,
        requesterId: dto.requesterId,
        reason: dto.reason,
        items: {
          create: dto.items.map((item) => ({
            materialBatchId: item.materialBatchId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            materialBatch: {
              include: {
                material: true,
              },
            },
          },
        },
      },
    });

    if (this.approvalEngine) {
      try {
        const approval = await this.approvalEngine.startApproval({
          resourceType: 'material_scrap',
          resourceId: materialScrap.id,
          resourceStep: 'submit',
          triggerKey: 'submit',
          title: `报废单审批：${materialScrap.scrapNo ?? materialScrap.id}`,
          createdById: dto.requesterId,
        });
        await this.prisma.materialScrap.update({
          where: { id: materialScrap.id },
          data: { approvalInstanceId: approval.id },
        });
      } catch {
        // No ApprovalDefinition matched — skip unified tracking silently
      }
    }

    return materialScrap;
  }

  async approve(id: string, dto: ApproveScrapDto) {
    const materialScrap = await this.prisma.materialScrap.findUnique({
      where: { id },
    });

    if (!materialScrap) {
      throw new NotFoundException('报废单不存在');
    }

    if (materialScrap.status !== 'draft') {
      throw new BadRequestException('只能审批草稿状态的报废单');
    }

    return this.prisma.materialScrap.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
      },
      include: {
        items: {
          include: {
            materialBatch: {
              include: {
                material: true,
              },
            },
          },
        },
      },
    });
  }

  async complete(id: string) {
    const materialScrap = await this.prisma.materialScrap.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            materialBatch: true,
          },
        },
      },
    });

    if (!materialScrap) {
      throw new NotFoundException('报废单不存在');
    }

    if (materialScrap.status !== 'approved') {
      throw new BadRequestException('只能完成已审批的报废单');
    }

    for (const item of materialScrap.items) {
      const stagingStock = await this.prisma.stagingAreaStock.findFirst({
        where: {
          batchId: item.materialBatchId,
        },
      });

      if (!stagingStock || stagingStock.quantity < item.quantity) {
        throw new BadRequestException(
          `暂存间批次 ${item.materialBatch.batchNumber} 库存不足`,
        );
      }
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of materialScrap.items) {
        const stagingStock = await tx.stagingAreaStock.findFirst({
          where: { batchId: item.materialBatchId },
        });

        await tx.stagingAreaStock.update({
          where: { id: stagingStock!.id },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        // Decrement warehouse stock (material is physically destroyed)
        await tx.materialBatch.update({
          where: { id: item.materialBatchId },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        await tx.stockRecord.create({
          data: {
            batchId: item.materialBatchId,
            recordType: 'scrap',
            quantity: item.quantity,
            relatedId: materialScrap.id,
            relatedType: 'MaterialScrap',
            operatorId: materialScrap.requesterId,
            remark: `报废单: ${materialScrap.scrapNo}`,
          },
        });

        await this.inventoryMovementLedger.recordMaterialBatchMovement(
          {
            movementType: 'scrap',
            batchId: item.materialBatchId,
            quantity: item.quantity,
            unit: 'kg',
            refType: 'scrap',
            refId: materialScrap.id,
            operatorId: materialScrap.requesterId,
            movedAt: new Date(),
            notes: '物料报废',
          },
          tx,
        );
      }

      return tx.materialScrap.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
        include: {
          items: {
            include: {
              materialBatch: {
                include: {
                  material: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.materialScrap.findMany({
      include: {
        items: {
          include: {
            materialBatch: {
              include: {
                material: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const materialScrap = await this.prisma.materialScrap.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            materialBatch: {
              include: {
                material: true,
              },
            },
          },
        },
      },
    });

    if (!materialScrap) {
      throw new NotFoundException('报废单不存在');
    }

    return materialScrap;
  }

  private async generateScrapNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.materialScrap.count({
      where: {
        scrapNo: {
          startsWith: `SCRAP-${today}`,
        },
      },
    });
    const sequence = String(count + 1).padStart(3, '0');
    return `SCRAP-${today}-${sequence}`;
  }
}
