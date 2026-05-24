import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { StorageService } from '../../common/services';
import { Snowflake, convertBigIntToNumber } from '../../common/utils';
import { withDocumentVersionLabel, withDocumentVersionLabels } from './document-version.presenter';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto, UpdateMarkdownDto } from './dto';
import { NotificationService } from '../notification/notification.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';
import { NumberRuleService } from './services/number-rule.service';
import { FilePreviewService } from './services';
import { MarkdownWikilinkService } from './services/markdown-wikilink.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import {
  CANONICAL_DOCUMENT_STATUS,
  EFFECTIVE_COMPAT_STATUSES,
  isEffectiveCompatible,
} from './constants/document-control.constants';
import { OwnershipContext } from '../module-access/ownership-context';

@Injectable()
export class DocumentService {
  private readonly snowflake: Snowflake;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notification: NotificationService,
    private readonly operationLog: OperationLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly metadataService: DocumentControlMetadataService,
    private readonly filePreviewService: FilePreviewService,
    private readonly markdownWikilinkService: MarkdownWikilinkService,
    private readonly numberRuleService: NumberRuleService,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {
    this.snowflake = new Snowflake(1, 1);
  }

  async generateDocumentNumber(level: number, departmentId: string, sourceFolder?: string | null): Promise<string> {
    return this.numberRuleService.generate({
      scope: 'document',
      level,
      departmentId,
      sourceFolder: sourceFolder ?? undefined,
      fallbackCategoryCode: this.categoryCodeForSourceFolder(sourceFolder),
    });
  }

  private categoryCodeForSourceFolder(sourceFolder?: string | null) {
    const map: Record<string, string> = {
      '01': 'SC',
      '02': 'CX',
      '03': 'ZD',
      '04': 'JL',
      '05': 'GS',
      '06': 'WL',
    };
    return sourceFolder ? map[sourceFolder] : undefined;
  }

  async create(dto: CreateDocumentDto, file: Express.Multer.File, userId: string) {
    // 获取用户的部门ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.departmentId) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '用户未分配部门，无法创建文档');
    }

    // BR-007: 检查同级别文件标题是否重复
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        level: dto.level,
        title: dto.title,
        deletedAt: null,
      },
    });

    if (existingDoc) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `同级别已存在标题为"${dto.title}"的文档，请修改标题`,
      );
    }

    const controlData = this.metadataService.normalize(dto.control);
    await this.validateOwnerReferences(controlData as Record<string, unknown>);

    const number = await this.generateDocumentNumber(dto.level, user.departmentId, controlData.source_folder as string | null | undefined);
    const uploadResult = await this.storage.uploadFile(file, `documents/level${dto.level}`);

    const result = await this.prisma.document.create({
      data: {
        id: this.snowflake.nextId(),
        level: dto.level,
        number,
        title: dto.title,
        filePath: uploadResult.path,
        fileName: file.originalname,
        fileSize: Number(file.size),
        fileType: file.mimetype,
        status: 'draft',
        creatorId: userId,
        departmentId: user.departmentId,
        ...(controlData as any),
      },
    });

    this.eventEmitter.emit('document.created', { documentId: result.id.toString() });

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'create',
      module: 'document',
      objectId: result.id.toString(),
      objectType: 'document',
      details: { title: dto.title, level: dto.level, fileName: file.originalname },
    });

    return withDocumentVersionLabel(convertBigIntToNumber(result));
  }

  async findAll(query: DocumentQueryDto, userId: string, role: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { level, keyword, status, documentType, sourceFolder, ownerDepartment, tag, dueWithinDays, issue } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (level !== undefined && level !== null) {
      where.level = level;
    }

    if (role === 'user') {
      where.creatorId = userId;
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { number: { contains: keyword } },
        // TODO: Replace with GIN full-text index for better performance
        { content_md: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = (EFFECTIVE_COMPAT_STATUSES as readonly string[]).includes(status)
        ? { in: [...EFFECTIVE_COMPAT_STATUSES] }
        : status;
    }

    if (documentType) where.document_type = documentType;
    if (sourceFolder) where.source_folder = sourceFolder;
    if (ownerDepartment) where.owner_department = ownerDepartment;
    if (tag) where.tags = { has: tag };

    if (dueWithinDays) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + dueWithinDays);
      where.review_due_date = { lte: deadline };
    }

    if (issue === 'missingMetadata') {
      const missingMetadataFilter = [
        { document_type: null },
        { source_folder: null },
        { review_due_date: null },
      ];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: missingMetadataFilter },
        ];
        delete where.OR;
      } else {
        where.OR = missingMetadataFilter;
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }) as unknown as any[],
      this.prisma.document.count({ where }),
    ]);

    // 批量获取创建人和审批人信息
    const creatorIds = [...new Set(list.map(d => d.creatorId).filter(Boolean))];
    const approverIds = [...new Set(list.map(d => d.approverId).filter(Boolean))];
    const userIds = [...new Set([...creatorIds, ...approverIds])];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u: { id: string; name: string }) => [u.id, u]));

    // 附加创建人和审批人信息
    const enrichedList = list.map(doc => ({
      ...doc,
      creator: doc.creatorId ? userMap.get(doc.creatorId) || null : null,
      approver: doc.approverId ? userMap.get(doc.approverId) || null : null,
    }));

    return { list: withDocumentVersionLabels(convertBigIntToNumber(enrichedList)), total, page, limit };
  }

  async findOne(id: string, userId: string, role: string) {
    const document = await this.prisma.document.findUnique({
      where: { id, deletedAt: null },
      include: {
        sourceReferences: {
          include: { targetDoc: { select: { id: true, title: true, status: true } } },
          orderBy: { createdAt: 'desc' },
        },
        targetReferences: {
          include: { sourceDoc: { select: { id: true, title: true, status: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    }) as unknown as any;

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    // 权限检查：普通用户只能查看自己创建的文档
    if (role === 'user' && document.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `无权访问文档 [${document.number}]，该文档属于其他用户`,
      );
    }

    return withDocumentVersionLabel(convertBigIntToNumber(document));
  }

  async update(id: string, dto: UpdateDocumentDto, file: Express.Multer.File | undefined, userId: string) {
    const document = await this.findOne(id, userId, 'user');

    if (document.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能修改自己创建的文档，文档 [${document.number}] 不属于您`,
      );
    }

    if (document.status !== 'draft' && document.status !== 'rejected') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `只能修改草稿或被驳回的文档，当前状态：${document.status}`,
      );
    }

    const controlData = dto.control ? this.metadataService.normalize(dto.control) : {};
    await this.validateOwnerReferences(controlData as Record<string, unknown>);

    if (file) {
      await this.prisma.documentVersion.create({
        data: {
          id: this.snowflake.nextId(),
          documentId: id,
          version: document.version,
          filePath: document.filePath,
          fileName: document.fileName,
          fileSize: Number(document.fileSize),
          creatorId: userId,
        },
      });

      const uploadResult = await this.storage.uploadFile(file, `documents/level${document.level}`);

      const result = await this.prisma.document.update({
        where: { id },
        data: {
          title: dto.title ?? document.title,
          filePath: uploadResult.path,
          fileName: file.originalname,
          fileSize: Number(file.size),
          fileType: file.mimetype,
          version: { increment: new Decimal(0.1) },
          ...(controlData as any),
        },
      });
      this.eventEmitter.emit('document.updated', { documentId: id });
      return withDocumentVersionLabel(convertBigIntToNumber(result));
    }

    const result = await this.prisma.document.update({
      where: { id },
      data: { title: dto.title ?? document.title, ...(controlData as any) },
    });
    this.eventEmitter.emit('document.updated', { documentId: id });
    return withDocumentVersionLabel(convertBigIntToNumber(result));
  }

  async updateMarkdown(id: string, userId: string, role: string, dto: UpdateMarkdownDto) {
    if (!dto || typeof dto.contentMd !== 'string') {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, 'contentMd 必须是字符串');
    }

    const result = await this.prisma.$transaction(async (tx: any) => {
      const document = await tx.document.findUnique({
        where: { id, deletedAt: null },
      });

      if (!document) {
        throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
      }

      if (role !== 'admin' && document.creatorId !== userId) {
        throw new BusinessException(ErrorCode.FORBIDDEN, '无权编辑该文档');
      }

      this.assertEditableDraft(document);

      const updated = await tx.document.update({
        where: { id },
        data: { content_md: dto.contentMd },
      });

      await this.markdownWikilinkService.syncDocumentWikilinks(id, dto.contentMd, tx);
      return updated;
    }, { isolationLevel: 'Serializable' });

    this.eventEmitter.emit('document.updated', { documentId: id });
    return convertBigIntToNumber(result);
  }

  async createRevisionDraft(id: string, userId: string) {
    const current = await this.prisma.document.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new BusinessException(ErrorCode.NOT_FOUND, '文件不存在');
    if (!isEffectiveCompatible((current as any).status)) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '只有已发布文件可以发起修订');
    }

    const existingDraft = await this.prisma.document.findFirst({
      where: {
        revisionOfId: id,
        status: { in: ['draft', 'pending', 'rejected'] },
        deletedAt: null,
      },
    });
    if (existingDraft) {
      throw new BusinessException(ErrorCode.CONFLICT, '已存在进行中的修订草稿');
    }

    const latest = await this.prisma.document.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { id },
          { revisionOfId: id },
          { lineage_key: (current as any).lineage_key ?? (current as any).number },
        ],
      },
      orderBy: { versionNo: 'desc' },
    });

    const nextVersionNo = ((latest as any)?.versionNo ?? (current as any).versionNo ?? 1) + 1;
    const revisionDraft = await this.prisma.document.create({
      data: {
        id: this.snowflake.nextId(),
        level: (current as any).level,
        number: (current as any).number,
        title: (current as any).title,
        filePath: (current as any).filePath,
        fileName: (current as any).fileName,
        fileSize: (current as any).fileSize,
        fileType: (current as any).fileType,
        version: nextVersionNo,
        versionNo: nextVersionNo,
        status: 'draft',
        revisionOfId: current.id,
        revisionStatus: 'revision_draft',
        creatorId: userId,
        departmentId: (current as any).departmentId,
        content: (current as any).content as any,
        document_type: (current as any).document_type,
        source_folder: (current as any).source_folder,
        owner_department: (current as any).owner_department,
        owner_user_id: (current as any).owner_user_id,
        ownerDepartmentId: (current as any).ownerDepartmentId,
        ownerUserId: (current as any).ownerUserId,
        tags: (current as any).tags ?? [],
        metadata: (current as any).metadata as any,
        lineage_key: (current as any).lineage_key ?? (current as any).number,
        review_due_date: (current as any).review_due_date,
        content_md: (current as any).content_md,
      } as any,
    });

    return withDocumentVersionLabel(convertBigIntToNumber(revisionDraft));
  }

  private assertEditableDraft(document: { status: string; revisionStatus?: string | null }) {
    if (!['draft', 'rejected'].includes(document.status)) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '已发布文件不能原地编辑，请先发起修订');
    }
  }

  async remove(id: string, userId: string) {
    const document = await this.findOne(id, userId, 'user');

    if (document.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能删除自己创建的文档，文档 [${document.number}] 不属于您`,
      );
    }

    if (isEffectiveCompatible(document.status)) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `已发布的文档 [${document.number}] 不能删除，请先停用`,
      );
    }

    // 获取创建者的部门ID（用于编号补齐）
    const creator = await this.prisma.user.findUnique({
      where: { id: document.creatorId },
      select: { departmentId: true },
    });

    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.storage.deleteFile(document.filePath);

    // BR-008: 将编号加入待补齐列表
    if (creator?.departmentId) {
      await this.prisma.pendingNumber.create({
        data: {
          id: this.snowflake.nextId(),
          level: document.level,
          departmentId: creator.departmentId,
          number: document.number,
          deletedAt: new Date(),
        },
      });
    }

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'delete',
      module: 'document',
      objectId: id,
      objectType: 'document',
      details: { documentNumber: document.number, title: document.title },
    });

    return { success: true };
  }

  async submitForApproval(id: string, userId: string) {
    const document = await this.findOne(id, userId, 'user');

    if (document.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能提交自己创建的文档，文档 [${document.number}] 不属于您`,
      );
    }

    // 支持 draft 或 rejected 状态的文档重新提交
    if (document.status !== 'draft' && document.status !== 'rejected') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `只能提交草稿或被驳回的文档，文档 [${document.number}] 当前状态：${document.status}`,
      );
    }

    // 获取创建人信息（仅用于日志，不再强制要求 superiorId）
    const creator = await this.prisma.user.findUnique({
      where: { id: document.creatorId },
    });

    if (!creator) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档创建人不存在');
    }

    // 新文档审批全部走 ApprovalInstance。旧 Approval 表自 PR-4 起不再新增写入。
    // 通过统一审批引擎发起审批（ApprovalDefinition 必须存在）
    if (!this.approvalEngine) {
      throw new Error('ApprovalEngineService not available — check document.module.ts');
    }
    const triggerKey = `publish.level${document.level ?? 3}`;

    // 原子性：先成功创建 ApprovalInstance，再落文档 pending + approvalInstanceId。
    // 避免引擎异常时文档陷入无 approvalInstanceId 的 pending 半状态。
    const instance = await this.prisma.$transaction(async (tx) => {
      const inst = await this.approvalEngine!.startApproval({
        resourceType: 'document',
        resourceId: id,
        resourceStep: 'publish',
        triggerKey,
        title: `文件发布审批：${document.title || id}`,
        createdById: userId,
        tx,
      });
      await tx.document.update({
        where: { id },
        data: { status: 'pending', approvalInstanceId: inst.id },
      });
      return inst;
    });

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'submit',
      module: 'document',
      objectId: id,
      objectType: 'document',
      details: { documentNumber: document.number, title: document.title },
    });

    return convertBigIntToNumber(
      await this.prisma.document.findUnique({ where: { id } }),
    );
  }

  async findPendingApprovals(userId: string, role: string, page = 1, limit = 20) {
    const where: any = { status: 'pending', deletedAt: null };
    const skip = (page - 1) * limit;

    // 如果是leader角色，需要过滤同部门的文档
    if (role === 'leader') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.departmentId) {
        const departmentUsers = await this.prisma.user.findMany({
          where: { departmentId: user.departmentId },
          select: { id: true },
        });
        where.creatorId = { in: departmentUsers.map((u: { id: string }) => u.id) };
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }) as unknown as Promise<any[]>,
      this.prisma.document.count({ where }),
    ]);

    // 批量获取创建人信息
    const creatorIds = [...new Set(list.map(d => d.creatorId).filter(Boolean))];
    const creators = await this.prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true },
    });
    const creatorMap = new Map(creators.map((u: { id: string; name: string }) => [u.id, u]));

    // 附加创建人信息
    const enrichedList = list.map(doc => ({
      ...doc,
      creator: doc.creatorId ? creatorMap.get(doc.creatorId) || null : null,
    }));

    return { list: convertBigIntToNumber(enrichedList), total, page, limit };
  }

  async supersedePreviousEffectiveRevision(
    tx: PrismaService | Prisma.TransactionClient,
    document: { id: string; number: string; lineage_key?: string | null; revisionOfId?: string | null },
  ) {
    if (!document.revisionOfId) return;

    const lineageKey = document.lineage_key ?? document.number;
    const previous = await tx.document.findFirst({
      where: {
        id: { not: document.id },
        deletedAt: null,
        status: { in: [...EFFECTIVE_COMPAT_STATUSES] },
        OR: [
          { lineage_key: lineageKey } as any,
          { id: document.revisionOfId },
          { number: document.number },
        ],
      },
    });

    if (!previous) return;

    await tx.document.update({
      where: { id: previous.id },
      data: {
        status: 'superseded',
        revisionStatus: 'superseded',
        superseded_by_id: document.id,
      } as any,
    });
  }

  private snapshotLabel(version: unknown): string {
    const value =
      typeof version === 'object' &&
      version !== null &&
      typeof (version as { toString?: unknown }).toString === 'function'
        ? (version as { toString: () => string }).toString()
        : String(version);
    return `文件快照 ${value}`;
  }

  async getVersionHistory(id: string, userId: string, role: string) {
    const document = (await this.findOne(id, userId, role)) as any;
    const lineageKey = document.lineage_key ?? document.number;

    const [revisionRows, versionRows] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          OR: [
            { id },
            { revisionOfId: id },
            { lineage_key: lineageKey },
            { number: document.number },
          ] as any,
        },
        orderBy: [{ versionNo: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          number: true,
          title: true,
          version: true,
          versionNo: true,
          status: true,
          revisionStatus: true,
          revisionOfId: true,
          superseded_by_id: true,
          lineage_key: true,
          createdAt: true,
          updatedAt: true,
        } as any,
      }) as unknown as any[],
      this.prisma.documentVersion.findMany({
        where: { documentId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true },
          },
        },
      }) as unknown as any[],
    ]);

    const seenRevisionIds = new Set<string>();
    const revisions = revisionRows
      .filter((row) => {
        if (seenRevisionIds.has(row.id)) return false;
        seenRevisionIds.add(row.id);
        return true;
      })
      .map((row) => {
        const decorated = withDocumentVersionLabel(row);
        return { ...decorated, isCurrentVersion: row.revisionStatus === 'current' };
      });

    const versions = versionRows.map((row) => {
      const versionStr =
        row.version != null &&
        typeof row.version === 'object' &&
        typeof (row.version as { toString?: unknown }).toString === 'function'
          ? (row.version as { toString: () => string }).toString()
          : String(row.version);
      return {
        ...row,
        version: versionStr,
        documentVersionNo: document.versionNo,
        documentVersionLabel: document.versionLabel,
        snapshotVersionLabel: this.snapshotLabel(row.version),
      };
    });

    return {
      document,
      revisions: convertBigIntToNumber(revisions),
      versions: convertBigIntToNumber(versions),
    };
  }

  async deactivate(id: string, userId: string, role: string) {
    const document = await this.findOne(id, userId, role);

    if (role !== 'admin' && document.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能停用自己创建的文档，文档 [${document.number}] 不属于您`,
      );
    }

    if (!isEffectiveCompatible(document.status)) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `文档 [${document.number}] 当前状态为 [${document.status}]，只有已生效文档可操作`,
      );
    }

    const result = await this.prisma.document.update({
      where: { id },
      data: { status: 'inactive' },
    });

    return convertBigIntToNumber(result);
  }

  async archive(id: string, reason: string, userId: string, role: string) {
    const document = await this.findOne(id, userId, role);

    // 状态校验：只有已生效的文档可以归档
    if (!isEffectiveCompatible(document.status)) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `文档 [${document.number}] 当前状态为 [${document.status}]，只有已生效文档可操作`,
      );
    }

    // BR-346: 权限校验 - 仅文档创建者或管理员可归档
    const isCreator = document.creatorId === userId;
    const isAdmin = role === 'admin';

    if (!isCreator && !isAdmin) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `无权归档文档 [${document.number}]，仅文档创建者或管理员可归档`,
      );
    }

    // 归档文档
    const result = await this.prisma.document.update({
      where: { id },
      data: {
        status: 'archived',
        archiveReason: reason,
        archivedAt: new Date(),
        archivedBy: userId,
      },
    });

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'archive',
      module: 'document',
      objectId: id,
      objectType: 'document',
      details: { documentNumber: document.number, reason },
    });

    // 发送通知
    await this.notification.create({
      userId: document.creatorId,
      type: 'document_archived',
      title: '文档已归档',
      content: `您的文档 [${document.number} ${document.title}] 已被归档`,
    });

    return convertBigIntToNumber(result);
  }

  async restore(id: string, reason: string, userId: string, role: string) {
    const document = await this.findOne(id, userId, role);

    // BR-348: 仅归档文档可恢复，作废文档不可恢复
    if (document.status !== 'archived') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `文档 [${document.number}] 当前状态为 [${document.status}]，仅归档文档可恢复`,
      );
    }

    // BR-348: 权限校验 - 仅管理员可恢复归档文档
    if (role !== 'admin') {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `无权恢复文档 [${document.number}]，仅管理员可恢复归档文档`,
      );
    }

    // P1-8: 恢复文档到已发布状态，同时清除归档字段
    const result = await this.prisma.document.update({
      where: { id },
      data: {
        status: CANONICAL_DOCUMENT_STATUS.EFFECTIVE,
        archiveReason: null,
        archivedAt: null,
        archivedBy: null,
        obsoleteReason: null,
        obsoletedAt: null,
        obsoletedBy: null,
      },
    });

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'restore',
      module: 'document',
      objectId: id,
      objectType: 'document',
      details: { documentNumber: document.number, reason },
    });

    // 发送通知
    await this.notification.create({
      userId: document.creatorId,
      type: 'document_restored',
      title: '文档已恢复',
      content: `您的文档 [${document.number} ${document.title}] 已从归档状态恢复`,
    });

    return convertBigIntToNumber(result);
  }

  async permanentDelete(id: string, userId: string) {
    // 权限检查：只有管理员可以物理删除
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleObj: true },
    });

    const userRoleCode = user?.roleObj?.code;
    if (!user || userRoleCode !== 'admin') {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        '只有管理员可以物理删除文档',
      );
    }

    // 查找文档（包括已软删除的）
    const document = await this.prisma.document.findUnique({
      where: { id },
    }) as unknown as any;

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    // 验证文档已软删除
    if (!document.deletedAt) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `只能物理删除已软删除的文档，文档 [${document.number}] 未软删除`,
      );
    }

    // 获取所有版本历史
    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId: id },
    }) as unknown as any[];

    // 删除文件（主文件 + 所有版本）
    await this.storage.deleteFile(document.filePath);
    for (const version of versions) {
      await this.storage.deleteFile(version.filePath);
    }

    // 删除版本历史记录
    await this.prisma.documentVersion.deleteMany({
      where: { documentId: id },
    });

    // 物理删除文档记录
    await this.prisma.document.delete({
      where: { id },
    });

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'permanent_delete',
      module: 'document',
      objectId: id,
      objectType: 'document',
      details: { documentNumber: document.number, title: document.title },
    });

    return { success: true };
  }


  async getVersionPreview(documentId: string, version: string, userId: string, role: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    await this.filePreviewService.assertFileAccess(document, userId, role);
    const versionDecimal = this.parseVersionParam(version);
    const item = await this.prisma.documentVersion.findFirst({
      where: { documentId, version: versionDecimal },
    });

    if (!item) {
      throw new BusinessException(ErrorCode.NOT_FOUND, `版本 ${version} 不存在`);
    }

    const fileType = this.inferFileTypeFromHistoricalFile(item.fileName, item.filePath);
    if (fileType === 'application/pdf') {
      return {
        type: 'pdf',
        url: await this.storage.getSignedUrl(item.filePath, 900),
        fileName: item.fileName,
      };
    }

    return {
      type: 'download',
      url: `/api/v1/documents/${documentId}/versions/${version}/download`,
      fileName: item.fileName,
      message: '该历史版本暂不支持在线预览，请下载后查看',
    };
  }

  async downloadVersion(
    documentId: string,
    version: string,
    userId: string,
    role: string,
    res: Response,
  ): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    await this.filePreviewService.assertFileAccess(document, userId, role);
    const versionDecimal = this.parseVersionParam(version);
    const item = await this.prisma.documentVersion.findFirst({
      where: { documentId, version: versionDecimal },
    });

    if (!item) {
      throw new BusinessException(ErrorCode.NOT_FOUND, `版本 ${version} 不存在`);
    }

    const stream = await this.storage.getFileStream(item.filePath);
    const headers: Record<string, string> = {
      'Content-Type': this.inferFileTypeFromHistoricalFile(item.fileName, item.filePath),
      'Content-Disposition': this.buildDownloadContentDisposition(item.fileName),
    };
    if (item.fileSize !== null && item.fileSize !== undefined) {
      headers['Content-Length'] = String(item.fileSize);
    }
    res.set(headers);
    stream.pipe(res);
  }

  private async validateOwnerReferences(controlData: Record<string, unknown>) {
    const ownerDepartmentId = typeof controlData.ownerDepartmentId === 'string'
      ? controlData.ownerDepartmentId
      : undefined;
    const ownerUserId = typeof controlData.ownerUserId === 'string'
      ? controlData.ownerUserId
      : undefined;

    if (ownerDepartmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: ownerDepartmentId, deletedAt: null },
      });
      if (!department) {
        throw new BusinessException(ErrorCode.NOT_FOUND, '负责部门不存在');
      }
    }

    if (ownerUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: ownerUserId, deletedAt: null },
      });
      if (!user) {
        throw new BusinessException(ErrorCode.NOT_FOUND, '负责人不存在');
      }
    }
  }

  private parseVersionParam(version: string): Decimal {
    try {
      return new Decimal(version);
    } catch {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, `版本参数无效: ${version}`);
    }
  }

  private buildDownloadContentDisposition(fileName: string): string {
    const fallback = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'download';
    return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  }

  private inferFileTypeFromHistoricalFile(fileName: string, filePath?: string | null): string {
    const extension = [fileName, filePath ?? '']
      .map((source) => source.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1])
      .find(Boolean);

    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc':
        return 'application/msword';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'xls':
        return 'application/vnd.ms-excel';
      default:
        return 'application/octet-stream';
    }
  }
}
