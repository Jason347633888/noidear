import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { StorageService } from '../../common/services';
import { Snowflake, convertBigIntToNumber } from '../../common/utils';
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

    return convertBigIntToNumber(result);
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

    const userMap = new Map(users.map(u => [u.id, u]));

    // 附加创建人和审批人信息
    const enrichedList = list.map(doc => ({
      ...doc,
      creator: doc.creatorId ? userMap.get(doc.creatorId) || null : null,
      approver: doc.approverId ? userMap.get(doc.approverId) || null : null,
    }));

    return { list: convertBigIntToNumber(enrichedList), total, page, limit };
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

    return convertBigIntToNumber(document);
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
          version: { increment: new Prisma.Decimal(0.1) },
          ...(controlData as any),
        },
      });
      this.eventEmitter.emit('document.updated', { documentId: id });
      return convertBigIntToNumber(result);
    }

    const result = await this.prisma.document.update({
      where: { id },
      data: { title: dto.title ?? document.title, ...(controlData as any) },
    });
    this.eventEmitter.emit('document.updated', { documentId: id });
    return convertBigIntToNumber(result);
  }

  async updateMarkdown(id: string, userId: string, role: string, dto: UpdateMarkdownDto) {
    if (!dto || typeof dto.contentMd !== 'string') {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, 'contentMd 必须是字符串');
    }

    const result = await this.prisma.$transaction(async (tx) => {
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

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
    return this.prisma.document.create({
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

    // 获取创建人的信息（包含上级ID）
    const creator = await this.prisma.user.findUnique({
      where: { id: document.creatorId },
    });

    if (!creator) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档创建人不存在');
    }

    if (!creator.superiorId) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '文档创建人未设置上级，无法提交审批');
    }

    // 更新文档状态
    await this.prisma.document.update({
      where: { id },
      data: { status: 'pending' },
    });

    // 创建审批记录（旧 Approval 表保持兼容）
    await this.prisma.approval.create({
      data: {
        id: this.snowflake.nextId(),
        documentId: id,
        approverId: creator.superiorId,
        status: 'pending',
      },
    });

    // 尝试通过统一审批引擎发起新流程（无匹配定义时降级，不影响旧流程）
    if (this.approvalEngine) {
      const triggerKey = `publish.level${document.level ?? 3}`;
      try {
        const instance = await this.approvalEngine.startApproval({
          resourceType: 'document',
          resourceId: id,
          resourceStep: 'publish',
          triggerKey,
          title: `文件发布审批：${document.title || id}`,
          createdById: userId,
        });
        await this.prisma.document.update({
          where: { id },
          data: { approvalInstanceId: instance.id },
        });
      } catch {
        // 无匹配 ApprovalDefinition 时跳过统一追踪，旧 Approval 表继续工作
      }
    }

    // 发送通知给审批人
    await this.notification.create({
      userId: creator.superiorId,
      type: 'approval',
      title: '您有新的文档待审批',
      content: `${creator.name} 提交了文档《${document.title}》等待您的审批`,
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
        where.creatorId = { in: departmentUsers.map(u => u.id) };
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
    const creatorMap = new Map(creators.map(u => [u.id, u]));

    // 附加创建人信息
    const enrichedList = list.map(doc => ({
      ...doc,
      creator: doc.creatorId ? creatorMap.get(doc.creatorId) || null : null,
    }));

    return { list: convertBigIntToNumber(enrichedList), total, page, limit };
  }

  async approve(id: string, status: string, comment: string | undefined, approverId: string) {
    const document = await this.findOne(id, approverId, 'leader');

    if (document.status !== 'pending') {
      throw new BusinessException(ErrorCode.CONFLICT, `只能审批待审批状态的文档，当前状态：${document.status}`);
    }

    // 驳回时必须填写原因
    if (status === 'rejected' && !comment) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '驳回时必须填写原因');
    }

    // 验证是否有待处理的审批记录
    const pendingApproval = await this.prisma.approval.findFirst({
      where: {
        documentId: id,
        status: 'pending',
      },
    });

    if (!pendingApproval) {
      throw new BusinessException(ErrorCode.CONFLICT, '该文档没有待处理的审批记录');
    }

    // 获取审批人信息用于权限检查
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '审批人不存在');
    }

    // 获取文档创建人信息用于权限检查
    const creator = await this.prisma.user.findUnique({
      where: { id: document.creatorId },
    });

    // 权限控制：验证是否为指定的审批人
    const isDesignatedApprover = pendingApproval.approverId === approverId;
    const isAdmin = approver?.role === 'admin';

    if (!isDesignatedApprover && !isAdmin) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        '您无权审批此文档',
      );
    }

    // 更新待处理的审批记录状态
    await this.prisma.approval.update({
      where: { id: pendingApproval.id },
      data: {
        status: status === 'approved' ? 'approved' : 'rejected',
        comment: comment ?? null,
      },
    });

    const result = await this.prisma.document.update({
      where: { id },
      data: {
        status: status === 'approved'
          ? CANONICAL_DOCUMENT_STATUS.EFFECTIVE
          : CANONICAL_DOCUMENT_STATUS.REJECTED,
        approverId,
        approvedAt: new Date(),
      },
    });

    // 发送通知给文档创建人
    await this.notification.create({
      userId: document.creatorId,
      type: 'approval',
      title: status === 'approved' ? '您的文档已通过审批' : '您的文档被驳回',
      content: status === 'approved'
        ? `您的文档《${document.title}》已通过审批并发布`
        : `您的文档《${document.title}》被驳回，原因：${comment || '无'}`,
    });

    // 记录操作日志
    await this.operationLog.log({
      userId: approverId,
      action: status === 'approved' ? 'approve' : 'reject',
      module: 'document',
      objectId: id,
      objectType: 'document',
      details: {
        documentNumber: document.number,
        title: document.title,
        comment: comment || null,
      },
    });

    // 异步触发引用快照同步（BR-306）：审批通过后通知所有引用此文档的文档更新快照
    if (status === 'approved') {
      this.eventEmitter.emit('document.approved', {
        documentId: id,
        snapshot: { title: document.title, number: document.number, approvedAt: new Date().toISOString() },
      });
    }

    return convertBigIntToNumber(result);
  }

  async getVersionHistory(id: string, userId: string, role: string) {
    const document = await this.findOne(id, userId, role);

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    }) as unknown as any[];

    return { document, versions: convertBigIntToNumber(versions) };
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

  async obsolete(id: string, reason: string, userId: string, role: string) {
    const document = await this.findOne(id, userId, role);

    // 状态校验：只有已生效的文档可以作废
    if (!isEffectiveCompatible(document.status)) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `文档 [${document.number}] 当前状态为 [${document.status}]，只有已生效文档可操作`,
      );
    }

    // BR-347: 权限校验 - 仅质量部管理员或系统管理员可作废文档
    // P2-19: 集成 P1-2 细粒度权限检查
    const isAdmin = role === 'admin';
    const isQualityManager = role === 'quality_manager';

    if (!isAdmin && !isQualityManager) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `无权作废文档 [${document.number}]，仅管理员或质量部管理员可作废文档`,
      );
    }

    // 作废文档
    const result = await this.prisma.document.update({
      where: { id },
      data: {
        status: 'obsolete',
        obsoleteReason: reason,
        obsoletedAt: new Date(),
        obsoletedBy: userId,
      },
    });

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'obsolete',
      module: 'document',
      objectId: id,
      objectType: 'document',
      details: { documentNumber: document.number, reason },
    });

    // 发送通知
    await this.notification.create({
      userId: document.creatorId,
      type: 'document_obsoleted',
      title: '文档已作废',
      content: `您的文档 [${document.number} ${document.title}] 已被作废`,
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

  async withdraw(id: string, userId: string) {
    const document = await this.findOne(id, userId, 'user');

    // 权限检查：只能撤回自己创建的文档
    if (document.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能撤回自己创建的文档，文档 [${document.number}] 不属于您`,
      );
    }

    // 状态检查：只能撤回待审批的文档
    if (document.status !== 'pending') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `只能撤回待审批状态的文档，当前状态：${document.status}`,
      );
    }

    // 查找待处理的审批记录
    const pendingApproval = await this.prisma.approval.findFirst({
      where: {
        documentId: id,
        status: 'pending',
      },
    });

    if (!pendingApproval) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        '该文档没有待处理的审批记录',
      );
    }

    // 更新审批记录为已撤回
    await this.prisma.approval.update({
      where: { id: pendingApproval.id },
      data: { status: 'withdrawn' },
    });

    // 更新文档状态为草稿
    const result = await this.prisma.document.update({
      where: { id },
      data: { status: 'draft' },
    });

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'withdraw',
      module: 'document',
      objectId: id,
      objectType: 'document',
      details: { documentNumber: document.number, title: document.title },
    });

    return convertBigIntToNumber(result);
  }

  async permanentDelete(id: string, userId: string) {
    // 权限检查：只有管理员可以物理删除
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'admin') {
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

    // 删除审批记录
    await this.prisma.approval.deleteMany({
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

  /**
   * 对比两个文档版本
   * TASK-010: 文档版本对比API
   */
  async compareVersions(
    documentId: string,
    v1: string,
    v2: string,
    userId: string,
  ) {
    const version1Decimal = this.parseVersionParam(v1);
    const version2Decimal = this.parseVersionParam(v2);
    const document = await this.prisma.document.findUnique({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '文档不存在或已被删除',
      );
    }

    const version1 = await this.prisma.documentVersion.findFirst({
      where: {
        documentId,
        version: version1Decimal,
      },
      include: {
        creator: {
          select: { id: true, username: true, name: true },
        },
      },
    });

    if (!version1) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        `版本 ${v1} 不存在`,
      );
    }

    const version2 = await this.prisma.documentVersion.findFirst({
      where: {
        documentId,
        version: version2Decimal,
      },
      include: {
        creator: {
          select: { id: true, username: true, name: true },
        },
      },
    });

    if (!version2) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        `版本 ${v2} 不存在`,
      );
    }

    const fileSizeChange = version2.fileSize - version1.fileSize;
    const fileNameChanged = version1.fileName !== version2.fileName;
    const creatorChanged = version1.creatorId !== version2.creatorId;
    const timeDiff = Math.floor(
      (version2.createdAt.getTime() - version1.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      documentId,
      documentTitle: (document as any).title,
      version1: {
        version: version1.version.toFixed(1),
        fileName: version1.fileName,
        fileSize: version1.fileSize,
        creator: version1.creator,
        createdAt: version1.createdAt,
      },
      version2: {
        version: version2.version.toFixed(1),
        fileName: version2.fileName,
        fileSize: version2.fileSize,
        creator: version2.creator,
        createdAt: version2.createdAt,
      },
      differences: {
        fileSizeChange,
        fileNameChanged,
        creatorChanged,
        timeDiff,
      },
    };
  }

  /**
   * 回滚文档到指定版本
   * TASK-010: 文档版本回滚API
   */
  async rollbackVersion(
    documentId: string,
    targetVersion: string,
    reason: string,
    userId: string,
  ) {
    if (!reason?.trim()) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '回滚原因不能为空');
    }

    const targetVersionDecimal = this.parseVersionParam(targetVersion);

    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.findUnique({
        where: { id: documentId, deletedAt: null },
      });

      if (!document) {
        throw new BusinessException(
          ErrorCode.NOT_FOUND,
          '文档不存在或已被删除',
        );
      }

      if (['archived', 'obsolete'].includes((document as any).status)) {
        throw new BusinessException(
          ErrorCode.CONFLICT,
          `文档当前状态为 [${(document as any).status}]，不能回滚版本`,
        );
      }

      const version = await tx.documentVersion.findFirst({
        where: {
          documentId,
          version: targetVersionDecimal,
        },
      });

      if (!version) {
        throw new BusinessException(
          ErrorCode.NOT_FOUND,
          `版本 ${targetVersion} 不存在`,
        );
      }

      const currentVersion = new Prisma.Decimal((document as any).version);
      const newVersion = currentVersion.add(0.1);
      const rollbackFileType = this.inferFileTypeFromHistoricalFile(
        version.fileName,
        version.filePath,
      );

      await tx.documentVersion.create({
        data: {
          id: this.snowflake.nextId(),
          documentId,
          version: currentVersion,
          filePath: (document as any).filePath,
          fileName: (document as any).fileName,
          fileSize: Number((document as any).fileSize),
          creatorId: userId,
        },
      });

      const updated = await tx.document.updateMany({
        where: { id: documentId, version: currentVersion },
        data: {
          version: newVersion,
          filePath: version.filePath,
          fileName: version.fileName,
          fileSize: version.fileSize,
          fileType: rollbackFileType,
        },
      });

      if (updated.count !== 1) {
        throw new BusinessException(ErrorCode.CONFLICT, '文档版本已变化，请刷新后重试');
      }

      await this.operationLog.log({
        userId,
        action: 'rollback_version',
        module: 'document',
        objectId: documentId,
        objectType: 'document',
        details: {
          fromVersion: currentVersion.toFixed(1),
          targetVersion,
          newVersion: newVersion.toFixed(1),
          reason,
          documentNumber: (document as any).number,
        },
      });

      return {
        success: true,
        newVersion: newVersion.toFixed(1),
        rolledBackFrom: targetVersion,
      };
    });
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

  private parseVersionParam(version: string): Prisma.Decimal {
    try {
      return new Prisma.Decimal(version);
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
