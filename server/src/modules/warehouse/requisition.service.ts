import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as dayjs from 'dayjs';

@Injectable()
export class RequisitionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: any) {
    const requisitionNo = this.generateRequisitionNo();

    return this.prisma.$transaction(async (tx) => {
      const requisition = await tx.materialRequisition.create({
        data: {
          requisitionNo,
          requisitionType: createDto.requisitionType,
          applicantId: createDto.applicantId,
          departmentId: createDto.departmentId,
          remark: createDto.remark,
          status: 'draft',
        },
      });

      await tx.materialRequisitionItem.createMany({
        data: createDto.items.map((item: any) => ({
          requisitionId: requisition.id,
          ...item,
        })),
      });

      return requisition;
    });
  }

  private generateRequisitionNo(): string {
    const today = dayjs().format('YYYYMMDD');
    const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REQ-${today}-${seq}`;
  }

  async findAll(query: any) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.materialRequisition.findMany({
        where,
        skip,
        take: limit,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.materialRequisition.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const requisition = await this.prisma.materialRequisition.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!requisition || requisition.deletedAt) {
      throw new NotFoundException('Requisition not found');
    }

    return requisition;
  }

  async approve(id: string, approverId: string) {
    await this.findOne(id);

    return this.prisma.materialRequisition.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approverId,
      },
    });
  }

  async complete(id: string, operatorId: string) {
    const requisition = await this.findOne(id);

    if (requisition.status !== 'approved') {
      throw new BadRequestException('Only approved requisition can be completed');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of requisition.items) {
        await tx.materialBatch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.quantity } },
        });

        await tx.stagingAreaStock.upsert({
          where: { id: item.batchId },
          create: {
            batchId: item.batchId,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        });

        await tx.stockRecord.create({
          data: {
            batchId: item.batchId,
            recordType: 'out',
            quantity: item.quantity,
            relatedId: requisition.id,
            relatedType: 'requisition',
            operatorId,
          },
        });
      }

      return tx.materialRequisition.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    });
  }
}
