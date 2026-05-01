import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MaterialBatchService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: { materialId?: string; keyword?: string; limit?: number } = {}) {
    const { materialId, keyword, limit = 20 } = options;
    const where: any = { deletedAt: null, status: 'normal', quantity: { gt: 0 } };

    if (materialId) {
      where.materialId = materialId;
    }

    const normalizedKeyword = keyword?.trim();
    if (normalizedKeyword) {
      where.OR = [
        { batchNumber: { contains: normalizedKeyword, mode: 'insensitive' } },
        { material: { is: { name: { contains: normalizedKeyword, mode: 'insensitive' } } } },
        { supplier: { is: { name: { contains: normalizedKeyword, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.materialBatch.findMany({
      where,
      include: {
        material: true,
        supplier: true,
      },
      orderBy: [
        { expiryDate: 'asc' },
        { createdAt: 'asc' },
      ],
      take: Math.min(Math.max(Number(limit) || 20, 1), 50),
    });
  }

  async findOne(id: string) {
    const batch = await this.prisma.materialBatch.findUnique({
      where: { id },
      include: {
        material: true,
        supplier: true,
        stockRecords: {
          orderBy: { createdAt: 'desc' },
        },
        batchMaterialUsages: {
          include: {
            productionBatch: true,
          },
        },
      },
    });

    if (!batch || batch.deletedAt) {
      throw new NotFoundException('Material batch not found');
    }

    return batch;
  }

  async update(id: string, updateDto: any) {
    await this.findOne(id);

    if ('batchNumber' in updateDto) {
      throw new BadRequestException('Batch number cannot be modified (BR-242)');
    }

    return this.prisma.materialBatch.update({
      where: { id },
      data: updateDto,
    });
  }
}
