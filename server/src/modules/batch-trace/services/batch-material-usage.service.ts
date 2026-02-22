import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface CreateBatchMaterialUsageDto {
  productionBatchId: string;
  materialBatchId: string;
  quantity: number;
}

@Injectable()
export class BatchMaterialUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateBatchMaterialUsageDto) {
    return this.prisma.batchMaterialUsage.create({
      data: createDto,
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
}
