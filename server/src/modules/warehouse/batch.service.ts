import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBatchDto, UpdateBatchDto, QueryBatchDto } from './dto/batch.dto';

@Injectable()
export class BatchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBatchDto: CreateBatchDto) {
    try {
      return await this.prisma.materialBatch.create({
        data: createBatchDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Batch number already exists (BR-241)');
      }
      throw error;
    }
  }

  async findAll(query: QueryBatchDto) {
    const { page = 1, limit = 10, status, materialId, search } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(status, materialId, search);

    const [data, total] = await Promise.all([
      this.prisma.materialBatch.findMany({
        where,
        skip,
        take: limit,
        include: { material: true, supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.materialBatch.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private buildWhereClause(status?: string, materialId?: string, search?: string) {
    const where: any = { deletedAt: null };

    if (status) {
      where.status = status;
    }

    if (materialId) {
      where.materialId = materialId;
    }

    if (search) {
      where.OR = [
        { batchNumber: { contains: search } },
        { supplierBatchNo: { contains: search } },
      ];
    }

    return where;
  }

  async findOne(id: string) {
    const batch = await this.prisma.materialBatch.findUnique({
      where: { id },
      include: {
        material: true,
        supplier: true,
        stockRecords: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!batch || batch.deletedAt) {
      throw new NotFoundException('Batch not found');
    }

    return batch;
  }

  async update(id: string, updateBatchDto: UpdateBatchDto) {
    await this.findOne(id);

    if ('batchNumber' in updateBatchDto) {
      throw new BadRequestException('Batch number cannot be modified (BR-242)');
    }

    return this.prisma.materialBatch.update({
      where: { id },
      data: updateBatchDto,
    });
  }

  async lock(id: string) {
    await this.findOne(id);

    return this.prisma.materialBatch.update({
      where: { id },
      data: { status: 'locked' },
    });
  }

  async getFIFO(materialId: string) {
    return this.prisma.materialBatch.findMany({
      where: {
        materialId,
        status: 'normal',
        quantity: { gt: 0 },
        deletedAt: null,
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async lockExpiredBatchesCron() {
    const locked = await this.lockExpiredBatches();
    console.log(`Locked ${locked} expired batches`);
  }

  async lockExpiredBatches(currentDate: Date = new Date()): Promise<number> {
    const expiredBatches = await this.findExpiredBatches(currentDate);
    await this.updateBatchesToExpired(expiredBatches);
    return expiredBatches.length;
  }

  private async findExpiredBatches(currentDate: Date) {
    return this.prisma.materialBatch.findMany({
      where: {
        expiryDate: { lt: currentDate },
        status: 'normal',
        deletedAt: null,
      },
    });
  }

  private async updateBatchesToExpired(batches: any[]) {
    const updatePromises = batches.map((batch) =>
      this.prisma.materialBatch.update({
        where: { id: batch.id },
        data: { status: 'expired' },
      }),
    );
    await Promise.all(updatePromises);
  }
}
