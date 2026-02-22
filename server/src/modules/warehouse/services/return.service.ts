import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReturnDto, ApproveReturnDto } from '../dto/return.dto';

@Injectable()
export class ReturnService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReturnDto) {
    // Validate all batches exist
    for (const item of dto.items) {
      const batch = await this.prisma.materialBatch.findUnique({
        where: { id: item.materialBatchId },
      });
      if (!batch) {
        throw new NotFoundException(`批次 ${item.materialBatchId} 不存在`);
      }
    }

    // Generate return number
    const returnNo = await this.generateReturnNumber();

    return this.prisma.materialReturn.create({
      data: {
        returnNo,
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
  }

  async approve(id: string, dto: ApproveReturnDto) {
    const materialReturn = await this.prisma.materialReturn.findUnique({
      where: { id },
    });

    if (!materialReturn) {
      throw new NotFoundException('退料单不存在');
    }

    if (materialReturn.status !== 'draft') {
      throw new BadRequestException('只能审批草稿状态的退料单');
    }

    return this.prisma.materialReturn.update({
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
    const materialReturn = await this.prisma.materialReturn.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            materialBatch: true,
          },
        },
      },
    });

    if (!materialReturn) {
      throw new NotFoundException('退料单不存在');
    }

    if (materialReturn.status !== 'approved') {
      throw new BadRequestException('只能完成已审批的退料单');
    }

    // Validate staging area stock for all items
    for (const item of materialReturn.items) {
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

    // Transaction: StagingAreaStock ↓ + MaterialBatch ↑ + StockRecord (type: return)
    return this.prisma.$transaction(async (tx) => {
      for (const item of materialReturn.items) {
        // Decrement staging area stock
        const stagingStock = await tx.stagingAreaStock.findFirst({
          where: { batchId: item.materialBatchId },
        });

        await tx.stagingAreaStock.update({
          where: { id: stagingStock!.id },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        // Increment warehouse stock
        await tx.materialBatch.update({
          where: { id: item.materialBatchId },
          data: {
            quantity: { increment: item.quantity },
          },
        });

        // Create stock record
        await tx.stockRecord.create({
          data: {
            batchId: item.materialBatchId,
            recordType: 'return',
            quantity: item.quantity,
            relatedId: materialReturn.id,
            relatedType: 'MaterialReturn',
            operatorId: materialReturn.requesterId,
            remark: `退料单: ${materialReturn.returnNo}`,
          },
        });
      }

      // Update return status
      return tx.materialReturn.update({
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
    return this.prisma.materialReturn.findMany({
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
    const materialReturn = await this.prisma.materialReturn.findUnique({
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

    if (!materialReturn) {
      throw new NotFoundException('退料单不存在');
    }

    return materialReturn;
  }

  private async generateReturnNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.materialReturn.count({
      where: {
        returnNo: {
          startsWith: `RET-${today}`,
        },
      },
    });
    const sequence = String(count + 1).padStart(3, '0');
    return `RET-${today}-${sequence}`;
  }
}
