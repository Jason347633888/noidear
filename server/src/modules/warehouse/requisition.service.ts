import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import { InventoryMovementLedgerService } from './services/inventory-movement-ledger.service';
import { SupplierAccessService } from './services/supplier-access.service';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class RequisitionService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly approvalEngine: ApprovalEngineService,
    private readonly inventoryMovementLedger: InventoryMovementLedgerService,
    private readonly supplierAccess: SupplierAccessService,
  ) {}

  async create(createDto: any) {
    const requisitionNo = this.generateRequisitionNo();

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const requisitionType = createDto.requisitionType ?? 'production';
      await this.validateEquipmentLink(tx, requisitionType, createDto.equipmentId);

      const requisition = await tx.materialRequisition.create({
        data: {
          requisitionNo,
          requisitionType,
          applicantId: createDto.applicantId ?? 'system',
          departmentId: createDto.departmentId,
          remark: createDto.remark,
          targetZone: createDto.targetZone,
          equipmentId: createDto.equipmentId,
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

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    if (value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
      return (value as { toNumber: () => number }).toNumber();
    }
    return Number(value);
  }

  private async validateEquipmentLink(tx: Prisma.TransactionClient, requisitionType: string, equipmentId?: string) {
    if (requisitionType === 'maintenance' && !equipmentId) {
      throw new BadRequestException('维修领料必须关联设备');
    }

    if (requisitionType !== 'maintenance' && equipmentId) {
      throw new BadRequestException('只有维修领料可以关联设备');
    }

    if (!equipmentId) {
      return;
    }

    const equipment = await tx.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null },
      select: { id: true },
    });
    if (!equipment) {
      throw new BadRequestException('设备不存在或已删除');
    }
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
        include: {
          items: true,
          equipment: { select: { id: true, code: true, name: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.materialRequisition.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const requisition = await this.prisma.materialRequisition.findUnique({
      where: { id },
      include: {
        items: true,
        equipment: { select: { id: true, code: true, name: true, status: true } },
      },
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

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of requisition.items) {
        await this.supplierAccess.assertBatchSupplierUsable(item.batchId, '完成领料');
        const requestedQty = this.toNumber(item.quantity);
        const { count } = await tx.materialBatch.updateMany({
          where: { id: item.batchId, quantity: { gte: requestedQty } },
          data: { quantity: { decrement: requestedQty } },
        });

        if (count === 0) {
          const batch = await tx.materialBatch.findUnique({
            where: { id: item.batchId },
            select: { batchNumber: true },
          });
          if (!batch) {
            throw new BadRequestException(`物料批次不存在：${item.batchId}`);
          }
          throw new BadRequestException(`物料批次库存不足：${batch.batchNumber ?? item.batchId}`);
        }

        const existingStock = await tx.stagingAreaStock.findFirst({
          where: {
            batchId: item.batchId,
            location: requisition.targetZone ?? '未指定',
            area_id: null,
          },
        });

        if (existingStock) {
          await tx.stagingAreaStock.update({
            where: { id: existingStock.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.stagingAreaStock.create({
            data: {
              batchId: item.batchId,
              quantity: item.quantity,
              location: requisition.targetZone ?? '未指定',
            },
          });
        }

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

        await this.inventoryMovementLedger.recordMaterialBatchMovement(
          {
            movementType: 'issue_to_production',
            batchId: item.batchId,
            quantity: item.quantity,
            unit: 'kg',
            refType: 'requisition',
            refId: requisition.id,
            operatorId,
            movedAt: new Date(),
            toLocation: requisition.targetZone ?? undefined,
            notes: '生产领料',
          },
          tx,
        );
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
