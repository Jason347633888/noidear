import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BatchNumberGeneratorService } from './batch-number-generator.service';
import {
  CreateProductionBatchDto,
  UpdateProductionBatchDto,
  QueryProductionBatchDto,
} from '../dto/production-batch.dto';

@Injectable()
export class ProductionBatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batchNumberGenerator: BatchNumberGeneratorService,
  ) {}

  async create(createDto: CreateProductionBatchDto) {
    const batchNumber = await this.batchNumberGenerator.generateBatchNumber('production');

    return this.prisma.productionBatch.create({
      data: {
        batchNumber,
        ...createDto,
        status: 'pending',
      },
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
        finishedGoods: true,
      },
    });

    if (!batch || batch.deletedAt) {
      throw new NotFoundException('Production batch not found');
    }

    return batch;
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
