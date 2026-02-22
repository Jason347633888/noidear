import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MaterialBatchService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(materialId?: string) {
    const where: any = { deletedAt: null };
    
    if (materialId) {
      where.materialId = materialId;
    }

    return this.prisma.materialBatch.findMany({
      where,
      include: {
        material: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
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
