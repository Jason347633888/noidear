import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EFFECTIVE_COMPAT_STATUSES } from '../constants/document-control.constants';
import {
  WORKBENCH_ISSUE_TYPES,
  WorkbenchIssueItem,
  WorkbenchIssueListResponse,
  WorkbenchIssueQueryDto,
  WorkbenchIssueType,
} from '../dto/document-control.dto';

@Injectable()
export class DocumentControlWorkbenchService {
  constructor(private readonly prisma: PrismaService) {}

  private getDeadline(days = 30) {
    const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + safeDays);
    return deadline;
  }

  private getPage(query: WorkbenchIssueQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
  }

  private assertIssueType(type: string): asserts type is WorkbenchIssueType {
    if (!WORKBENCH_ISSUE_TYPES.includes(type as WorkbenchIssueType)) {
      throw new BadRequestException(`Unsupported workbench issue type: ${type}`);
    }
  }

  async getWorkbench(days = 30) {
    const deadline = this.getDeadline(days);

    const pendingReviewWhere = { deletedAt: null, status: { in: ['pending_review', 'pending'] } };
    const dueForReviewWhere = { deletedAt: null, status: { in: [...EFFECTIVE_COMPAT_STATUSES] }, review_due_date: { lte: deadline } };
    const expiringWhere = { deletedAt: null, document_type: 'EXTERNAL_FILE', external_expires_at: { lte: deadline }, status: { in: [...EFFECTIVE_COMPAT_STATUSES] } };
    const obsoleteRefWhere = { targetDoc: { status: { in: ['obsolete', 'archived', 'superseded'] } } };
    const brokenRefWhere = { targetType: { in: ['record_template', 'record_list', 'business_module', 'business_object'] }, targetRoute: null };
    const missingLandingWhere = { OR: [{ targetRoute: null }, { targetModule: null }] };
    const missingMetaWhere = { deletedAt: null, OR: [{ document_type: null }, { source_folder: null }, { review_due_date: null }] };
    const trainingWhere = { status: { in: ['suggested', 'open', 'pending'] } };
    const impactWhere = { status: { in: ['open', 'pending'] } };

    const [
      pendingReview,
      dueForReview,
      expiringExternalFiles,
      obsoleteReferences,
      brokenReferences,
      missingLandingTargets,
      missingMetadata,
      trainingNeeds,
      openImpactItems,
      pendingReviewCount,
      dueForReviewCount,
      expiringCount,
      obsoleteRefCount,
      brokenRefCount,
      missingLandingCount,
      missingMetaCount,
      trainingCount,
      impactCount,
    ] = await Promise.all([
      this.prisma.document.findMany({ where: pendingReviewWhere, orderBy: { updatedAt: 'desc' }, take: 100 }),
      this.prisma.document.findMany({ where: dueForReviewWhere, orderBy: { review_due_date: 'asc' }, take: 100 }),
      this.prisma.document.findMany({ where: expiringWhere, orderBy: { external_expires_at: 'asc' }, take: 100 }),
      this.prisma.documentReference.findMany({
        where: obsoleteRefWhere,
        include: {
          sourceDoc: { select: { id: true, title: true, status: true } },
          targetDoc: { select: { id: true, title: true, status: true } },
        },
        take: 100,
      }),
      this.prisma.documentReference.findMany({
        where: brokenRefWhere,
        include: { sourceDoc: { select: { id: true, title: true, status: true } } },
        take: 100,
      }),
      this.prisma.recordFormLandingEntry.findMany({ where: missingLandingWhere, orderBy: { updatedAt: 'desc' }, take: 100 }),
      this.prisma.document.findMany({ where: missingMetaWhere, orderBy: { updatedAt: 'desc' }, take: 100 }),
      this.prisma.documentTrainingNeed.findMany({ where: trainingWhere, orderBy: { updatedAt: 'desc' }, take: 100 }),
      this.prisma.documentImpactItem.findMany({ where: impactWhere, orderBy: { updatedAt: 'desc' }, take: 100 }),
      this.prisma.document.count({ where: pendingReviewWhere }),
      this.prisma.document.count({ where: dueForReviewWhere }),
      this.prisma.document.count({ where: expiringWhere }),
      this.prisma.documentReference.count({ where: obsoleteRefWhere }),
      this.prisma.documentReference.count({ where: brokenRefWhere }),
      this.prisma.recordFormLandingEntry.count({ where: missingLandingWhere }),
      this.prisma.document.count({ where: missingMetaWhere }),
      this.prisma.documentTrainingNeed.count({ where: trainingWhere }),
      this.prisma.documentImpactItem.count({ where: impactWhere }),
    ]);

    return {
      pendingReview,
      dueForReview,
      expiringExternalFiles,
      obsoleteReferences,
      brokenReferences,
      missingLandingTargets,
      missingMetadata,
      trainingNeeds,
      openImpactItems,
      counts: {
        pendingReview: pendingReviewCount,
        dueForReview: dueForReviewCount,
        expiringExternalFiles: expiringCount,
        obsoleteReferences: obsoleteRefCount,
        brokenReferences: brokenRefCount,
        missingLandingTargets: missingLandingCount,
        missingMetadata: missingMetaCount,
        trainingNeeds: trainingCount,
        openImpactItems: impactCount,
      },
    };
  }

  async listIssues(query: WorkbenchIssueQueryDto): Promise<WorkbenchIssueListResponse> {
    this.assertIssueType(query.type);
    const { page, limit, skip } = this.getPage(query);
    const deadline = this.getDeadline(query.days);
    const { total, rows } = await this.queryIssueRows(query.type, deadline, skip, limit);
    const items = rows.map((row: any) => this.toIssueItem(query.type, row));
    return {
      type: query.type,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async queryIssueRows(type: WorkbenchIssueType, deadline: Date, skip: number, take: number) {
    if (type === 'pendingReview') {
      const where = { deletedAt: null, status: { in: ['pending_review', 'pending'] } };
      const [total, rows] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'dueForReview') {
      const where = { deletedAt: null, status: { in: [...EFFECTIVE_COMPAT_STATUSES] }, review_due_date: { lte: deadline } };
      const [total, rows] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({ where, orderBy: { review_due_date: 'asc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'expiringExternalFiles') {
      const where = {
        deletedAt: null,
        document_type: 'EXTERNAL_FILE',
        external_expires_at: { lte: deadline },
        status: { in: [...EFFECTIVE_COMPAT_STATUSES] },
      };
      const [total, rows] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({ where, orderBy: { external_expires_at: 'asc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'obsoleteReferences') {
      const where = { targetDoc: { status: { in: ['obsolete', 'archived', 'superseded'] } } };
      const [total, rows] = await Promise.all([
        this.prisma.documentReference.count({ where }),
        this.prisma.documentReference.findMany({
          where,
          include: {
            sourceDoc: { select: { id: true, title: true, status: true } },
            targetDoc: { select: { id: true, title: true, status: true } },
          },
          skip,
          take,
        }),
      ]);
      return { total, rows };
    }

    if (type === 'brokenReferences') {
      const where = {
        targetType: { in: ['record_template', 'record_list', 'business_module', 'business_object'] },
        targetRoute: null,
      };
      const [total, rows] = await Promise.all([
        this.prisma.documentReference.count({ where }),
        this.prisma.documentReference.findMany({
          where,
          include: { sourceDoc: { select: { id: true, title: true, status: true } } },
          skip,
          take,
        }),
      ]);
      return { total, rows };
    }

    if (type === 'missingLandingTargets') {
      const where = { OR: [{ targetRoute: null }, { targetModule: null }] };
      const [total, rows] = await Promise.all([
        this.prisma.recordFormLandingEntry.count({ where }),
        this.prisma.recordFormLandingEntry.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'unconfirmedLandingTargets') {
      const where = { confirmationStatus: { in: ['unconfirmed', 'suggested'] } };
      const [total, rows] = await Promise.all([
        this.prisma.recordFormLandingEntry.count({ where }),
        this.prisma.recordFormLandingEntry.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'partialFieldCoverage') {
      const where = { fieldCoverageStatus: { in: ['partial', 'missing'] } };
      const [total, rows] = await Promise.all([
        this.prisma.recordFormLandingEntry.count({ where }),
        this.prisma.recordFormLandingEntry.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'unimplementedRecordReferences') {
      const where = {
        targetType: 'record_form_landing',
        snapshot: { path: ['landingStatus'], equals: 'unimplemented' },
      };
      const [total, rows] = await Promise.all([
        this.prisma.documentReference.count({ where }),
        this.prisma.documentReference.findMany({
          where,
          include: { sourceDoc: { select: { id: true, title: true, number: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
      ]);
      return { total, rows };
    }

    if (type === 'missingMetadata') {
      const where = {
        deletedAt: null,
        OR: [
          { document_type: null },
          { source_folder: null },
          { review_due_date: null },
        ],
      };
      const [total, rows] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'trainingNeeds') {
      const where = { status: { in: ['suggested', 'open', 'pending'] } };
      const [total, rows] = await Promise.all([
        this.prisma.documentTrainingNeed.count({ where }),
        this.prisma.documentTrainingNeed.findMany({
          where,
          include: { document: { select: { id: true, title: true, number: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
      ]);
      return { total, rows };
    }

    const where = { status: { in: ['open', 'pending'] } };
    const [total, rows] = await Promise.all([
      this.prisma.documentImpactItem.count({ where }),
      this.prisma.documentImpactItem.findMany({
        where,
        include: { review: { select: { id: true, title: true, sourceType: true, sourceId: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { total, rows };
  }

  private toIssueItem(type: WorkbenchIssueType, row: any): WorkbenchIssueItem {
    if (type === 'missingLandingTargets') {
      const code = row.sourceCode;
      return {
        id: row.id,
        issueType: type,
        severity: 'high',
        title: `${code} 缺少落地入口`,
        description: '记录表单索引缺少目标模块或目标路由，无法从文控中心导航到实际填报入口。',
        sourceType: 'record_form_landing',
        sourceId: code,
        sourceLabel: code,
        sourceRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}`,
        actionLabel: '维护表单入口',
        actionRoute: `/documents/control/record-form-index?issue=missingLandingTargets&code=${encodeURIComponent(code)}`,
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'unconfirmedLandingTargets') {
      const code = row.sourceCode;
      return {
        id: row.id,
        issueType: type,
        severity: 'medium' as const,
        title: `${code} 落地关系未确认`,
        description: '系统已有落地建议或手工入口，但尚未由管理员确认。',
        sourceType: 'record_form_landing',
        sourceId: code,
        sourceLabel: code,
        sourceRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}`,
        actionLabel: '确认落地关系',
        actionRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}&action=confirm`,
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'partialFieldCoverage') {
      const code = row.sourceCode;
      return {
        id: row.id,
        issueType: type,
        severity: 'medium' as const,
        title: `${code} 字段覆盖不完整`,
        description: '源表单字段与业务入口或动态模板字段存在差异，需要确认处理方式。',
        sourceType: 'record_form_landing',
        sourceId: code,
        sourceLabel: code,
        sourceRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}`,
        actionLabel: '查看字段覆盖',
        actionRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}&section=fieldCoverage`,
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'unimplementedRecordReferences') {
      const sourceDocId = row.sourceDocId ?? row.sourceDoc?.id;
      const label = row.targetLabel ?? row.targetId ?? '未命名引用';
      return {
        id: row.id,
        issueType: type,
        severity: 'medium' as const,
        title: `${row.sourceDoc?.title ?? '来源文件'} 引用表单未落地`,
        description: `引用的记录表单落地目标 ${label} 尚未实现落地配置。`,
        sourceType: 'document_reference',
        sourceId: sourceDocId,
        sourceLabel: row.sourceDoc?.title ?? sourceDocId,
        sourceRoute: `/documents/${sourceDocId}`,
        actionLabel: '查看引用',
        actionRoute: `/documents/${sourceDocId}?section=references&issue=${type}`,
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'obsoleteReferences' || type === 'brokenReferences') {
      const sourceDocId = row.sourceDocId ?? row.sourceDoc?.id;
      const label = row.targetLabel ?? row.targetDoc?.title ?? row.targetId ?? '未命名引用';
      return {
        id: row.id,
        issueType: type,
        severity: type === 'obsoleteReferences' ? 'high' : 'medium',
        title: `${row.sourceDoc?.title ?? '来源文件'} 引用异常`,
        description: type === 'obsoleteReferences'
          ? `引用目标 ${label} 已作废、归档或被替代。`
          : `引用目标 ${label} 缺少可用入口。`,
        sourceType: 'document_reference',
        sourceId: sourceDocId,
        sourceLabel: row.sourceDoc?.title ?? sourceDocId,
        sourceRoute: `/documents/${sourceDocId}`,
        actionLabel: '查看引用',
        actionRoute: `/documents/${sourceDocId}?section=references&issue=${type}`,
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'trainingNeeds') {
      return {
        id: row.id,
        issueType: type,
        severity: 'medium',
        title: row.document?.title ? `${row.document.title} 培训需求未处理` : '培训需求未处理',
        description: row.reason ?? '文档变更或阅读要求产生了培训需求，尚未接受、驳回或关联培训项目。',
        sourceType: 'document_training_need',
        sourceId: row.id,
        sourceLabel: row.document?.number ?? row.document?.title ?? row.id,
        sourceRoute: '/documents/operations/training-needs?status=suggested',
        actionLabel: '处理培训需求',
        actionRoute: '/documents/operations/training-needs?status=suggested',
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'openImpactItems') {
      return {
        id: row.id,
        issueType: type,
        severity: row.impactLevel === 'high' ? 'high' : 'medium',
        title: row.targetLabel ?? row.review?.title ?? '影响项未关闭',
        description: row.suggestedAction ?? '影响评审项仍处于打开状态，需要确认处理动作。',
        sourceType: 'document_impact_item',
        sourceId: row.id,
        sourceLabel: row.review?.title ?? row.id,
        sourceRoute: '/documents/operations/impact?status=open',
        actionLabel: '处理影响项',
        actionRoute: '/documents/operations/impact?status=open',
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    const documentId = row.id;
    const title = `${row.number ?? ''} ${row.title ?? '未命名文件'}`.trim();
    const base = {
      id: documentId,
      issueType: type,
      title,
      sourceType: 'document',
      sourceId: documentId,
      sourceLabel: title,
      sourceRoute: `/documents/${documentId}`,
      detectedAt: row.updatedAt ?? row.review_due_date ?? row.external_expires_at ?? row.createdAt ?? null,
    };

    if (type === 'pendingReview') {
      return { ...base, severity: 'medium', description: '文件处于待审核状态。', actionLabel: '查看审批文件', actionRoute: `/documents/${documentId}` };
    }
    if (type === 'dueForReview') {
      return { ...base, severity: 'medium', description: '文件已到或即将到达复审日期。', actionLabel: '查看复审文件', actionRoute: `/documents/control/library?issue=dueForReview&documentId=${documentId}` };
    }
    if (type === 'expiringExternalFiles') {
      return { ...base, severity: 'high', description: '外来文件已到或即将到达有效期。', actionLabel: '查看外来文件', actionRoute: `/documents/control/library?issue=expiringExternalFiles&documentId=${documentId}` };
    }
    return { ...base, severity: 'medium', description: '文件缺少文控元数据。', actionLabel: '补齐元数据', actionRoute: `/documents/${documentId}?section=metadata&issue=missingMetadata` };
  }
}
