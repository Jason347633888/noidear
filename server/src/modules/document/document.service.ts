import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { StorageService } from '../../common/services';
import { Snowflake, convertBigIntToNumber } from '../../common/utils';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto';
import { NotificationService } from '../notification/notification.service';
import { OperationLogService } from '../operation-log/operation-log.service';

@Injectable()
export class DocumentService {
  private readonly snowflake: Snowflake;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notification: NotificationService,
    private readonly operationLog: OperationLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.snowflake = new Snowflake(1, 1);
  }

  async generateDocumentNumber(level: number, departmentId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      // BR-008: 优先使用待补齐编号
      const pendingNumber = await tx.pendingNumber.findFirst({
        where: { level, departmentId },
        orderBy: { deletedAt: 'asc' }, // 先删除的先补齐
      });

      if (pendingNumber) {
        // 使用待补齐编号并删除记录
        await tx.pendingNumber.delete({
          where: { id: pendingNumber.id },
        });
        return pendingNumber.number;
      }

      // 没有待补齐编号，生成新编号（原逻辑）
      // 查询部门获取部门代码
      const department = await tx.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        throw new BusinessException(ErrorCode.NOT_FOUND, '部门不存在');
      }

      // 使用 SELECT FOR UPDATE 锁定行，防止并发冲突
      const rules = await tx.$queryRaw<Array<{ id: string; sequence: number }>>`
        SELECT id, sequence FROM number_rules
        WHERE level = ${level} AND department_id = ${departmentId}
        FOR UPDATE
      `;

      let rule = rules[0];
      if (!rule) {
        // 创建新规则
        rule = await tx.numberRule.create({
          data: {
            id: this.snowflake.nextId(),
            level,
            departmentId,
            sequence: 0,
          },
        });
      }

      const newSequence = rule.sequence + 1;

      // 更新序号
      await tx.numberRule.update({
        where: { id: rule.id },
        data: { sequence: newSequence },
      });

      const seqStr = String(newSequence).padStart(3, '0');
      // 格式: {级别}-{部门代码}-{序号} 如 1-HR-001
      return `${level}-${department.code}-${seqStr}`;
    });
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

    const number = await this.generateDocumentNumber(dto.level, user.departmentId);
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
    const { level, keyword, status } = query;
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
      ];
    }

    if (status) {
      where.status = status;
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
        },
      });
      this.eventEmitter.emit('document.updated', { documentId: id });
      return convertBigIntToNumber(result);
    }

    const result = await this.prisma.document.update({
      where: { id },
      data: { title: dto.title ?? document.title },
    });
    this.eventEmitter.emit('document.updated', { documentId: id });
    return convertBigIntToNumber(result);
  }

  async remove(id: string, userId: string) {
    const document = await this.findOne(id, userId, 'user');

    if (document.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能删除自己创建的文档，文档 [${document.number}] 不属于您`,
      );
    }

    if (document.status === 'approved') {
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

    // 创建审批记录
    await this.prisma.approval.create({
      data: {
        id: this.snowflake.nextId(),
        documentId: id,
        approverId: creator.superiorId,
        status: 'pending',
      },
    });

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
        status: status === 'approved' ? 'approved' : 'rejected',
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

    if (document.status !== 'approved') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `只能停用已发布的文档，文档 [${document.number}] 当前状态：${document.status}`,
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

    // 状态校验：只有已发布的文档可以归档
    if (document.status !== 'approved') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `文档 [${document.number}] 当前状态为 [${document.status}]，只有已发布文档可归档`,
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

    // 状态校验：只有已发布的文档可以作废
    if (document.status !== 'approved') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `文档 [${document.number}] 当前状态为 [${document.status}]，只有已发布文档可作废`,
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
        status: 'approved',
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
        version: new Prisma.Decimal(v1),
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
        version: new Prisma.Decimal(v2),
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
    userId: string,
  ) {
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

      const version = await tx.documentVersion.findFirst({
        where: {
          documentId,
          version: new Prisma.Decimal(targetVersion),
        },
      });

      if (!version) {
        throw new BusinessException(
          ErrorCode.NOT_FOUND,
          `版本 ${targetVersion} 不存在`,
        );
      }

      const currentVersion = (document as any).version;
      const newVersion = new Prisma.Decimal(currentVersion).add(0.1);

      await tx.documentVersion.create({
        data: {
          id: this.snowflake.nextId(),
          documentId,
          version: newVersion,
          filePath: version.filePath,
          fileName: version.fileName,
          fileSize: version.fileSize,
          creatorId: userId,
        },
      });

      await tx.document.update({
        where: { id: documentId },
        data: {
          version: newVersion,
          filePath: version.filePath,
          fileName: version.fileName,
          fileSize: version.fileSize,
        },
      });

      await this.operationLog.log({
        userId,
        action: 'rollback_version',
        module: 'document',
        objectId: documentId,
        objectType: 'document',
        details: {
          targetVersion,
          newVersion: newVersion.toString(),
          documentNumber: (document as any).number,
        },
      });

      return {
        success: true,
        newVersion: newVersion.toString(),
        rolledBackFrom: targetVersion,
      };
    });
  }
}
