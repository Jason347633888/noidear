import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { Snowflake } from '../../common/utils/snowflake';
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
  ) {
    this.snowflake = new Snowflake(1, 1);
  }

  private convertBigIntToNumber(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(item => this.convertBigIntToNumber(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.convertBigIntToNumber(obj[key]);
      }
      return result;
    }
    return obj;
  }

  private async generateDocumentNumber(level: number, departmentId: string): Promise<string> {
    // 查询部门获取部门代码
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '部门不存在');
    }

    let rule = await this.prisma.numberRule.findUnique({
      where: { level_departmentId: { level, departmentId } },
    });

    if (!rule) {
      rule = await this.prisma.numberRule.create({
        data: { id: this.snowflake.nextId(), level, departmentId, sequence: 0 },
      });
    }

    const sequence = rule.sequence + 1;
    await this.prisma.numberRule.update({
      where: { level_departmentId: { level, departmentId } },
      data: { sequence },
    });

    const seqStr = String(sequence).padStart(3, '0');
    // 格式: {级别}-{部门代码}-{序号} 如 1-HR-001
    return `${level}-${department.code}-${seqStr}`;
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

    // 记录操作日志
    await this.operationLog.log({
      userId,
      action: 'create',
      module: 'document',
      objectId: result.id.toString(),
      objectType: 'document',
      details: { title: dto.title, level: dto.level, fileName: file.originalname },
    });

    return this.convertBigIntToNumber(result);
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

    return { list: this.convertBigIntToNumber(enrichedList), total, page, limit };
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

    return this.convertBigIntToNumber(document);
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
          fileSize: BigInt(document.fileSize),
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
          version: { increment: 0.1 },
        },
      });
      return this.convertBigIntToNumber(result);
    }

    const result = await this.prisma.document.update({
      where: { id },
      data: { title: dto.title ?? document.title },
    });
    return this.convertBigIntToNumber(result);
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

    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.storage.deleteFile(document.filePath);

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

    return this.convertBigIntToNumber(
      await this.prisma.document.findUnique({ where: { id } }),
    );
  }

  async findPendingApprovals(userId: string, role: string) {
    const where: any = { status: 'pending', deletedAt: null };

    // 如果是leader角色，需要过滤同部门的文档
    let departmentUserIds: string[] = [];
    if (role === 'leader') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.departmentId) {
        const departmentUsers = await this.prisma.user.findMany({
          where: { departmentId: user.departmentId },
          select: { id: true },
        });
        departmentUserIds = departmentUsers.map(u => u.id);
        where.creatorId = { in: departmentUserIds };
      }
    }

    const list = (await this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })) as unknown as any[];

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

    return this.convertBigIntToNumber(enrichedList);
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
        `您无权审批此文档，该文档的审批人应为 ${pendingApproval.approverId}`,
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

    return this.convertBigIntToNumber(result);
  }

  async getVersionHistory(id: string, userId: string, role: string) {
    const document = await this.findOne(id, userId, role);

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
    }) as unknown as any[];

    return { document, versions: this.convertBigIntToNumber(versions) };
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

    return this.convertBigIntToNumber(result);
  }
}
