import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchNumberGeneratorService } from '../batch-trace/services/batch-number-generator.service';
import { CreateInboundDto, QueryInboundDto } from './dto/inbound.dto';
import * as dayjs from 'dayjs';

@Injectable()
export class InboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batchNumberGenerator: BatchNumberGeneratorService,
  ) {}

  async create(createInboundDto: CreateInboundDto) {
    const { supplierId, items, remark } = createInboundDto;
    const inboundNo = await this.generateInboundNo();

    return this.prisma.$transaction(async (tx) => {
      const inbound = await tx.materialInbound.create({
        data: {
          inboundNo,
          supplierId,
          status: 'draft',
          remark,
        },
      });

      await tx.materialInboundItem.createMany({
        data: items.map((item) => ({
          inboundId: inbound.id,
          ...item,
        })),
      });

      return inbound;
    });
  }

  private async generateInboundNo(): Promise<string> {
    const today = dayjs().format('YYYYMMDD');
    return `IN-${today}-${this.getSequence()}`;
  }

  private getSequence(): string {
    return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  async findAll(query: QueryInboundDto) {
    const { page = 1, limit = 10, status, supplierId } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(status, supplierId);

    const [data, total] = await Promise.all([
      this.prisma.materialInbound.findMany({
        where,
        skip,
        take: limit,
        include: {
          supplier: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.materialInbound.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private buildWhereClause(status?: string, supplierId?: string) {
    const where: any = { deletedAt: null };

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    return where;
  }

  async findOne(id: string) {
    const inbound = await this.prisma.materialInbound.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: true,
      },
    });

    if (!inbound || inbound.deletedAt) {
      throw new NotFoundException('Inbound order not found');
    }

    return inbound;
  }

  async approve(id: string, approverId: string) {
    const inbound = await this.findOne(id);

    if (inbound.status !== 'pending' && inbound.status !== 'draft') {
      throw new BadRequestException('Only pending/draft inbound can be approved');
    }

    return this.prisma.materialInbound.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approverId,
      },
    });
  }

  async complete(id: string, operatorId: string) {
    const inbound = await this.findOne(id);

    if (inbound.status !== 'approved') {
      throw new BadRequestException('Only approved inbound can be completed');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of inbound.items) {
        const batchNumber = await this.batchNumberGenerator.generateBatchNumber('material');

        const batch = await tx.materialBatch.create({
          data: {
            batchNumber,
            materialId: item.materialId,
            supplierBatchNo: item.supplierBatchNo,
            supplierId: inbound.supplierId,
            productionDate: item.productionDate,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            status: 'normal',
          },
        });

        await tx.stockRecord.create({
          data: {
            batchId: batch.id,
            recordType: 'in',
            quantity: item.quantity,
            relatedId: inbound.id,
            relatedType: 'inbound',
            operatorId,
          },
        });

        await tx.materialInboundItem.update({
          where: { id: item.id },
          data: { createdBatchId: batch.id },
        });
      }

      return tx.materialInbound.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          operatorId,
        },
      });
    });
  }
}
