import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

    const materialBatch = await this.prisma.materialBatch.findUnique({
      where: { id: dto.materialBatchId },
    });
    if (!materialBatch) {
      throw new NotFoundException('原料批次不存在');
    }

    if (materialBatch.quantity < dto.quantity) {
      throw new BadRequestException('原料批次库存不足');
    }

    return this.prisma.$transaction(async (tx) => {
      const usage = await tx.batchMaterialUsage.create({
        data: {
          productionBatchId: dto.productionBatchId,
          materialBatchId: dto.materialBatchId,
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

    return this.prisma.$transaction(async (tx) => {
      await tx.materialBatch.update({
        where: { id: usage.materialBatchId },
        data: { quantity: { increment: usage.quantity } },
      });

      await tx.batchMaterialUsage.delete({ where: { id } });
    });
  }
}
