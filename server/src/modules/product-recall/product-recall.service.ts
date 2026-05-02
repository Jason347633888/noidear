import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductRecallDto, CreateProductRecallNotificationDto } from './dto/create-product-recall.dto';
import { QueryProductRecallDto } from './dto/query-product-recall.dto';
import { MarkNotificationSentDto, RecallCancelDto, RecallCompleteDto, RecallReviewDto } from './dto/transition-product-recall.dto';

type CurrentUser = { id: string; companyId: string };

const allowedTransitions: Record<string, string[]> = {
  draft: ['pending_review', 'cancelled'],
  pending_review: ['approved', 'rejected'],
  approved: ['notified', 'cancelled'],
  notified: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

@Injectable()
export class ProductRecallService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductRecallDto, currentUser: CurrentUser) {
    const companyId = currentUser.companyId;
    const count = await this.prisma.productRecall.count({ where: { company_id: companyId } });
    const recall_no = `RC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx: any) => {
      const recall = await tx.productRecall.create({
        data: {
          company_id: companyId,
          recall_no,
          title: dto.title,
          reason: dto.reason,
          risk_level: dto.risk_level ?? 'medium',
          status: 'draft',
          source_complaint_id: dto.source_complaint_id,
          source_query_ref: dto.source_query_ref,
          source_traceability_snapshot_id: dto.source_traceability_snapshot_id,
          requested_by: currentUser.id,
        },
      });

      for (const batch of dto.batches ?? []) {
        const productionBatch = await tx.productionBatch.findFirst({
          where: { id: batch.production_batch_id },
          select: { id: true, batchNumber: true, productName: true, product: { select: { company_id: true } } },
        });
        if (!productionBatch) throw new BadRequestException(`生产批次不存在: ${batch.production_batch_id}`);
        if (productionBatch.product.company_id !== companyId) {
          throw new BadRequestException(`生产批次不属于当前企业: ${batch.production_batch_id}`);
        }

        await tx.productRecallBatch.create({
          data: {
            company_id: companyId,
            recall_id: recall.id,
            production_batch_id: productionBatch.id,
            batch_number_snapshot: productionBatch.batchNumber,
            product_name_snapshot: productionBatch.productName,
            affected_qty: batch.affected_qty,
            unit: batch.unit,
          },
        });
      }

      for (const notification of dto.notifications ?? []) {
        await this.createNotificationRow(tx, recall.id, notification, companyId);
      }

      return recall;
    });
  }

  async findAll(companyId: string, query: QueryProductRecallDto) {
    return this.prisma.productRecall.findMany({
      where: {
        company_id: companyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.risk_level ? { risk_level: query.risk_level } : {}),
        ...(query.source_complaint_id ? { source_complaint_id: query.source_complaint_id } : {}),
        ...(query.production_batch_id
          ? { batches: { some: { production_batch_id: query.production_batch_id } } }
          : {}),
      },
      include: { batches: true, notifications: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string, companyId: string) {
    const recall = await this.prisma.productRecall.findFirst({
      where: { id, company_id: companyId },
      include: {
        batches: true,
        notifications: true,
        evidence: true,
      },
    });
    if (!recall) throw new NotFoundException('召回记录不存在');
    return recall;
  }

  async submit(id: string, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'pending_review', {});
  }

  async approve(id: string, dto: RecallReviewDto, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'approved', {
      reviewed_by: currentUser.id,
      reviewed_at: new Date(),
      review_note: dto.review_note,
    });
  }

  async reject(id: string, dto: RecallReviewDto, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'rejected', {
      reviewed_by: currentUser.id,
      reviewed_at: new Date(),
      review_note: dto.review_note,
    });
  }

  async complete(id: string, dto: RecallCompleteDto, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'completed', {
      completed_by: currentUser.id,
      completed_at: new Date(),
      completion_summary: dto.completion_summary,
    });
  }

  async cancel(id: string, dto: RecallCancelDto, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'cancelled', {
      cancelled_at: new Date(),
      cancel_reason: dto.cancel_reason,
    });
  }

  async createNotification(id: string, dto: CreateProductRecallNotificationDto, currentUser: CurrentUser) {
    await this.findOne(id, currentUser.companyId);
    return this.createNotificationRow(this.prisma, id, dto, currentUser.companyId);
  }

  async markNotificationSent(id: string, notificationId: string, dto: MarkNotificationSentDto, currentUser: CurrentUser) {
    const notification = await this.prisma.productRecallNotification.findFirst({
      where: { id: notificationId, recall_id: id, company_id: currentUser.companyId },
    });
    if (!notification) throw new NotFoundException('召回通知不存在');

    const recall = await this.findOne(id, currentUser.companyId);
    await this.prisma.productRecallNotification.update({
      where: { id: notificationId },
      data: {
        status: 'sent',
        notified_at: new Date(),
        response_summary: dto.response_summary,
      },
    });

    if (recall.status === 'approved') {
      return this.prisma.productRecall.update({
        where: { id },
        data: { status: 'notified' },
      });
    }
    return this.findOne(id, currentUser.companyId);
  }

  private async transition(id: string, currentUser: CurrentUser, nextStatus: string, data: Record<string, unknown>) {
    const recall = await this.findOne(id, currentUser.companyId);
    if (!allowedTransitions[recall.status]?.includes(nextStatus)) {
      throw new BadRequestException(`召回状态不允许从 ${recall.status} 流转到 ${nextStatus}`);
    }
    return this.prisma.productRecall.update({
      where: { id },
      data: { ...data, status: nextStatus },
    });
  }

  private createNotificationRow(tx: any, recallId: string, dto: CreateProductRecallNotificationDto, companyId: string) {
    return tx.productRecallNotification.create({
      data: {
        company_id: companyId,
        recall_id: recallId,
        external_party_id: dto.external_party_id,
        customer_name: dto.customer_name,
        contact_name: dto.contact_name,
        contact_phone: dto.contact_phone,
        notification_method: dto.notification_method ?? 'phone',
      },
    });
  }
}
