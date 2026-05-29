import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import { CreateInboundDto, QueryInboundDto } from './dto/inbound.dto';
import { SupplierAccessService } from './services/supplier-access.service';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

@Injectable()
export class InboundService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly approvalEngine: ApprovalEngineService,
    private readonly supplierAccess: SupplierAccessService,
  ) {}

  async create(createInboundDto: CreateInboundDto, createdById?: string) {
    const { supplierId, items, remark } = createInboundDto;
    await this.supplierAccess.assertSupplierUsable(supplierId, '创建来料单');
    const inboundNo = await this.generateInboundNo();

    const inbound = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.materialInbound.create({
        data: {
          inboundNo,
          supplierId,
          status: 'draft',
          remark,
          // Write operatorId at creation so the creator can find the record via ownership filter
          operatorId: createdById ?? null,
        },
      });

      await tx.materialInboundItem.createMany({
        data: items.map((item) => ({
          inboundId: created.id,
          ...item,
        })),
      });

      return created;
    });

    if (this.approvalEngine) {
      try {
        const approval = await this.approvalEngine.startApproval({
          resourceType: 'material_inbound',
          resourceId: inbound.id,
          resourceStep: 'submit',
          triggerKey: 'submit',
          title: `入库单审批：${inbound.inboundNo ?? inbound.id}`,
          createdById: createdById ?? supplierId,
        });
        await this.prisma.materialInbound.update({
          where: { id: inbound.id },
          data: { approvalInstanceId: approval.id },
        });
      } catch {
        // No ApprovalDefinition matched — skip unified tracking silently
      }
    }

    return inbound;
  }

  private async generateInboundNo(): Promise<string> {
    const today = dayjs().format('YYYYMMDD');
    return `IN-${today}-${this.getSequence()}`;
  }

  private getSequence(): string {
    return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  async findAll(query: QueryInboundDto, ownership: OwnershipContext) {
    const { page = 1, limit = 10, status, supplierId } = query;
    const skip = (page - 1) * limit;

    const queryWhere = this.buildWhereClause(status, supplierId);
    const ownershipWhere = await this.buildOwnershipWhere(ownership);
    const where = { ...queryWhere, ...ownershipWhere };

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

  private async buildOwnershipWhere(ownership: OwnershipContext): Promise<Record<string, unknown>> {
    if (ownership.roleCode === 'admin') return {};
    if (ownership.roleCode === 'user') {
      return { operatorId: ownership.userId };
    }
    // leader
    const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
    if (memberIds.length === 0) return { id: 'no-match' };
    return { operatorId: { in: memberIds } };
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

  // Completing an inbound only transitions its status. Material batches, the
  // InventoryMovement ledger entry and the StockRecord balance projection are
  // now created exclusively when a FINAL incoming inspection is released
  // (IncomingInspectionService.releaseFinalInspection), gating stock on QC.
  async complete(id: string, operatorId: string) {
    const inbound = await this.findOne(id);

    if (inbound.status !== 'approved') {
      throw new BadRequestException('Only approved inbound can be completed');
    }

    return this.prisma.materialInbound.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        operatorId,
      },
    });
  }
}
