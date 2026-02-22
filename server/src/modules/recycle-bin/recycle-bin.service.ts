import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { NotificationService } from '../notification/notification.service';
import { DocumentService } from '../document/document.service';
import { StorageService } from '../../common/services';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { convertBigIntToNumber } from '../../common/utils';
import { Snowflake } from '../../common/utils/snowflake';

type RecycleBinType = 'document' | 'template' | 'task';

@Injectable()
export class RecycleBinService {
  private readonly snowflake = new Snowflake(1, 1);
  private readonly logger = new Logger(RecycleBinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLog: OperationLogService,
    private readonly notificationService: NotificationService,
    private readonly documentService: DocumentService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(
    type: RecycleBinType,
    page: number,
    limit: number,
    keyword?: string,
    userId?: string,
    role?: string,
  ) {
    this.validateRecycleBinType(type);

    // 管理员查看全部已删除项；非管理员只查看自己的已删除项
    const isAdmin = role === 'admin';
    const where = this.buildQueryWhere(keyword, isAdmin ? undefined : userId);
    const skip = (page - 1) * limit;
    const [list, total] = await this.fetchRecycleBinData(type, where, skip, limit);

    return {
      list: convertBigIntToNumber(list),
      total,
      page,
      limit,
    };
  }

  private validateRecycleBinType(type: RecycleBinType): void {
    const validTypes = ['document', 'template', 'task'];
    if (!validTypes.includes(type)) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '无效的类型');
    }
  }

  private buildQueryWhere(keyword?: string, creatorId?: string) {
    const where: any = { deletedAt: { not: null } };

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { number: { contains: keyword } },
      ];
    }

    return where;
  }

  private async fetchRecycleBinData(
    type: RecycleBinType,
    where: any,
    skip: number,
    limit: number,
  ): Promise<[any[], number]> {
    const queryOptions = {
      where,
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' as const },
    };

    if (type === 'document') {
      return Promise.all([
        this.prisma.document.findMany(queryOptions),
        this.prisma.document.count({ where }),
      ]);
    }

    if (type === 'template') {
      return Promise.all([
        this.prisma.template.findMany(queryOptions),
        this.prisma.template.count({ where }),
      ]);
    }

    return Promise.all([
      this.prisma.task.findMany(queryOptions),
      this.prisma.task.count({ where }),
    ]);
  }

  async restore(type: RecycleBinType, id: string, userId: string, role: string) {
    this.validateAdminRole(role, '恢复');

    if (type === 'document') {
      await this.restoreDocument(id, userId);
    } else if (type === 'template') {
      await this.restoreTemplate(id, userId);
    } else {
      await this.restoreTask(id, userId);
    }

    await this.logRestoreOperation(userId, type, id);
  }

  private validateAdminRole(role: string, operation: string): void {
    if (role !== 'admin') {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `仅管理员可${operation}项目`,
      );
    }
  }

  private async restoreDocument(id: string, adminUserId: string): Promise<void> {
    const doc = await this.findDocumentForRestore(id);
    const hasConflict = await this.checkNumberConflict(doc.number);

    if (hasConflict) {
      await this.restoreWithNewNumber(doc, adminUserId);
    } else {
      await this.restoreWithOriginalNumber(id);
    }

    await this.sendRestoredNotification(
      doc.creatorId,
      'document_restored',
      `您的文档《${doc.title}》已被管理员恢复`,
    );
  }

  private async findDocumentForRestore(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!doc) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    if (!doc.deletedAt) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '该文档未被删除',
      );
    }

    return doc;
  }

  private async checkNumberConflict(number: string): Promise<boolean> {
    const existing = await this.prisma.document.findFirst({
      where: { number, deletedAt: null },
    });
    return !!existing;
  }

  private async restoreWithNewNumber(doc: any, adminUserId: string) {
    const newNumber = await this.documentService.generateDocumentNumber(
      doc.level,
      doc.creator.departmentId,
    );

    await this.prisma.document.update({
      where: { id: doc.id },
      data: { deletedAt: null, number: newNumber },
    });

    await this.logNumberChange(adminUserId, doc.id, doc.number, newNumber);
  }

  private async restoreWithOriginalNumber(id: string) {
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private async logNumberChange(
    userId: string,
    docId: string,
    oldNumber: string,
    newNumber: string,
  ) {
    await this.operationLog.log({
      userId,
      action: 'number_change',
      module: 'recycle-bin',
      objectId: docId,
      objectType: 'document',
      details: { oldNumber, newNumber, reason: '恢复时编号冲突' },
    });
  }

  private async restoreTemplate(id: string, adminUserId: string): Promise<void> {
    const template = await this.findTemplateForRestore(id);

    await this.prisma.template.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.sendRestoredNotification(
      template.creatorId,
      'template_restored',
      `您的模板《${template.title}》已被管理员恢复`,
    );
  }

  private async findTemplateForRestore(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!template) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '模板不存在');
    }

    if (!template.deletedAt) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '该模板未被删除',
      );
    }

    return template;
  }

  private async restoreTask(id: string, adminUserId: string): Promise<void> {
    const task = await this.findTaskForRestore(id);

    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.sendRestoredNotification(
      task.creatorId,
      'task_restored',
      `您创建的任务已被管理员恢复`,
    );
  }

  private async findTaskForRestore(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { creator: true, template: true },
    });

    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }

    if (!task.deletedAt) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '该任务未被删除',
      );
    }

    return task;
  }

  private async sendRestoredNotification(
    userId: string,
    type: string,
    content: string,
  ) {
    await this.notificationService.create({
      userId,
      type,
      title: '项目已恢复',
      content,
    });
  }

  private async logRestoreOperation(
    userId: string,
    type: RecycleBinType,
    id: string,
  ) {
    await this.operationLog.log({
      userId,
      action: 'restore',
      module: 'recycle-bin',
      objectId: id,
      objectType: type,
      details: { type, id },
    });
  }

  async permanentDelete(type: RecycleBinType, id: string, userId: string, role: string) {
    this.validateAdminRole(role, '永久删除');

    if (type === 'document') {
      await this.permanentDeleteDocument(id);
    } else if (type === 'template') {
      await this.permanentDeleteTemplate(id);
    } else {
      await this.permanentDeleteTask(id);
    }

    await this.logPermanentDeleteOperation(userId, type, id);
  }

  private async permanentDeleteDocument(id: string): Promise<void> {
    const doc = await this.findDocumentForDelete(id);

    await this.deleteDocumentFile(doc.filePath);
    await this.prisma.document.delete({ where: { id } });
    await this.recyclePendingNumber(doc);
  }

  private async findDocumentForDelete(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!doc) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    if (!doc.deletedAt) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '该文档未被删除，无法永久删除',
      );
    }

    return doc;
  }

  private async deleteDocumentFile(filePath: string) {
    try {
      await this.storageService.deleteFile(filePath);
    } catch (error) {
      this.logger.warn(`MinIO 文件删除失败 (${filePath}): ${error}`);
    }
  }

  private async recyclePendingNumber(doc: any) {
    await this.prisma.pendingNumber.upsert({
      where: {
        level_departmentId_number: {
          level: doc.level,
          departmentId: doc.creator.departmentId,
          number: doc.number,
        },
      },
      update: {
        deletedAt: new Date(),
      },
      create: {
        id: this.snowflake.nextId(),
        number: doc.number,
        level: doc.level,
        departmentId: doc.creator.departmentId,
        deletedAt: new Date(),
      },
    });
  }

  private async permanentDeleteTemplate(id: string): Promise<void> {
    const template = await this.findTemplateForDelete(id);
    await this.prisma.template.delete({ where: { id } });
  }

  private async findTemplateForDelete(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });

    if (!template) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '模板不存在');
    }

    if (!template.deletedAt) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '该模板未被删除，无法永久删除',
      );
    }

    return template;
  }

  private async permanentDeleteTask(id: string): Promise<void> {
    const task = await this.findTaskForDelete(id);
    await this.prisma.task.delete({ where: { id } });
  }

  private async findTaskForDelete(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }

    if (!task.deletedAt) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '该任务未被删除，无法永久删除',
      );
    }

    return task;
  }

  private async logPermanentDeleteOperation(
    userId: string,
    type: RecycleBinType,
    id: string,
  ) {
    await this.operationLog.log({
      userId,
      action: 'permanent_delete',
      module: 'recycle-bin',
      objectId: id,
      objectType: type,
      details: { type, id },
    });
  }

  async batchRestore(type: RecycleBinType, ids: string[], userId: string, role: string) {
    this.validateAdminRole(role, '批量恢复');

    if (!ids || ids.length === 0) {
      return { success: true, message: '批量恢复成功' };
    }

    for (const id of ids) {
      await this.restore(type, id, userId, role);
    }

    await this.logBatchOperation(userId, type, ids, 'batch_restore');
  }

  private async logBatchOperation(
    userId: string,
    type: RecycleBinType,
    ids: string[],
    action: string,
  ) {
    await this.operationLog.log({
      userId,
      action,
      module: 'recycle-bin',
      objectId: ids.join(','),
      objectType: type,
      details: { type, count: ids.length },
    });
  }

  async batchPermanentDelete(type: RecycleBinType, ids: string[], userId: string, role: string) {
    this.validateAdminRole(role, '批量永久删除');

    if (!ids || ids.length === 0) {
      return { success: true, message: '批量永久删除成功' };
    }

    for (const id of ids) {
      await this.permanentDelete(type, id, userId, role);
    }

    await this.logBatchOperation(userId, type, ids, 'batch_permanent_delete');
  }
}
