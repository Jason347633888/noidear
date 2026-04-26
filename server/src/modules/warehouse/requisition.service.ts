import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import * as dayjs from 'dayjs';

@Injectable()
export class RequisitionService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly approvalEngine: ApprovalEngineService,
  ) {}

  async create(createDto: any) {
    const requisitionNo = this.generateRequisitionNo();

    return this.prisma.$transaction(async (tx) => {
      const requisition = await tx.materialRequisition.create({
        data: {
          requisitionNo,
          requisitionType: createDto.requisitionType ?? 'production',
          applicantId: createDto.applicantId ?? 'system',
          departmentId: createDto.departmentId,
          remark: createDto.remark,
          targetZone: createDto.targetZone,
          status: 'draft',
        },
      });

      if (createDto.items?.length) {
        await tx.materialRequisitionItem.createMany({
          data: createDto.items.map((item: any) => ({
            requisitionId: requisition.id,
            ...item,
          })),
        });
      }

      return requisition;
    });
  }

  private generateRequisitionNo(): string {
    const today = dayjs().format('YYYYMMDD');
    const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REQ-${today}-${seq}`;
  }

  async findAll(query: any) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '10', 10);
    const { status } = query;
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

  async submit(id: string) {
    const req = await this.findOne(id);
    if (req.status !== 'draft') throw new BadRequestException('只有草稿状态可提交');
    const updated = await this.prisma.materialRequisition.update({
      where: { id },
      data: { status: 'pending', submittedAt: new Date() },
    });

    if (this.approvalEngine) {
      try {
        const approval = await this.approvalEngine.startApproval({
          resourceType: 'material_requisition',
          resourceId: id,
          resourceStep: 'submit',
          triggerKey: 'submit',
          title: `领料单审批：${req.requisitionNo ?? id}`,
          createdById: req.applicantId,
        });
        await this.prisma.materialRequisition.update({
          where: { id },
          data: { approvalInstanceId: approval.id },
        });
      } catch {
        // No ApprovalDefinition matched — skip unified tracking silently
      }
    }

    return updated;
  }

  async approve(id: string, approverId: string, action: 'approved' | 'rejected' = 'approved') {
    const req = await this.findOne(id);
    if (req.status !== 'pending') throw new BadRequestException('只有待审批状态可审批');

    return this.prisma.materialRequisition.update({
      where: { id },
      data: {
        status: action,
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
          where: {
            batchId_location: {
              batchId: item.batchId,
              location: requisition.targetZone ?? '未指定',
            },
          },
          create: {
            batchId: item.batchId,
            quantity: item.quantity,
            location: requisition.targetZone ?? '未指定',
          },
          update: { quantity: { increment: item.quantity } },
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
