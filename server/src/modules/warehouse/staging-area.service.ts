import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StagingAreaService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentStock(query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    const [data, total] = await Promise.all([
      this.prisma.stagingAreaStock.findMany({
        where,
        skip,
        take: limit,
        include: {
          batch: {
            include: {
              material: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stagingAreaStock.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async recordInventory(recordDto: any) {
    if (recordDto.recordType === 'opening') {
      return this.prisma.stagingAreaRecord.create({
        data: recordDto,
      });
    }

    const stock = await this.prisma.stagingAreaStock.findFirst({
      where: { batchId: recordDto.batchId },
    });

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.stagingAreaRecord.create({
        data: recordDto,
      });

      if (stock) {
        await tx.stagingAreaStock.update({
          where: { id: stock.id },
          data: { quantity: recordDto.quantity },
        });
      }

      return record;
    });
  }

  async getInventoryHistory(batchId: string) {
    return this.prisma.stagingAreaRecord.findMany({
      where: { batchId },
      include: { operator: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
