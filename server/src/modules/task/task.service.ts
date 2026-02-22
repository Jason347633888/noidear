import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviationService } from '../deviation/deviation.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreateTaskDto, TaskQueryDto, SubmitTaskDto, ApproveTaskDto, BatchAssignTaskDto, ExportTaskDto } from './dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { DraftTaskDto } from './dto/draft-task.dto';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const safe = require('safe-regex') as (re: string | RegExp, opts?: { limit?: number }) => boolean;

interface FieldValidationError {
  field: string;
  message: string;
}

const RELATION_INCLUDES = {
  template: true,
  department: true,
  creator: {
    select: { id: true, username: true, name: true, role: true, departmentId: true },
  },
  records: true,
};

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deviationService: DeviationService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 创建任务
   * BR-005: 停用模板不允许创建任务
   */
  async create(dto: CreateTaskDto, userId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id: dto.templateId, deletedAt: null },
    });

    if (!template) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '模板不存在或已被删除',
      );
    }

    if (template.status !== 'active') {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        `模板 [${template.title}] 已停用，不允许创建任务`,
      );
    }

    const task = await this.prisma.task.create({
      data: {
        id: crypto.randomUUID(),
        templateId: dto.templateId,
        departmentId: dto.departmentId,
        deadline: new Date(dto.deadline),
        creatorId: userId,
      },
    });

    await this.notifyDepartmentMembers(
      dto.departmentId,
      '新任务分配',
      `您有一个新任务待完成，模板：${template.title}`,
    );

    return task;
  }

  /**
   * 批量分配任务
   * TASK-047: 批量创建任务到多个部门
   * BR-005: 停用模板不允许创建任务
   */
  async batchAssign(dto: BatchAssignTaskDto, userId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id: dto.templateId, deletedAt: null },
    });

    if (!template) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '模板不存在或已被删除',
      );
    }

    if (template.status !== 'active') {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        `模板 [${template.title}] 已停用，不允许创建任务`,
      );
    }

    const departments = await this.prisma.department.findMany({
      where: {
        id: { in: dto.departmentIds },
        deletedAt: null,
      },
    });

    if (departments.length !== dto.departmentIds.length) {
      const foundIds = departments.map((d) => d.id);
      const missingIds = dto.departmentIds.filter((id) => !foundIds.includes(id));
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        `以下部门不存在: ${missingIds.join(', ')}`,
      );
    }

    const tasks = [];
    const deadline = new Date(dto.deadline);

    for (const departmentId of dto.departmentIds) {
      const task = await this.prisma.task.create({
        data: {
          id: crypto.randomUUID(),
          templateId: dto.templateId,
          departmentId,
          deadline,
          creatorId: userId,
        },
      });

      tasks.push(task);

      await this.notifyDepartmentMembers(
        departmentId,
        '新任务分配',
        `您有一个新任务待完成，模板：${template.title}`,
      );
    }

    return {
      success: true,
      total: tasks.length,
      tasks,
    };
  }

  /**
   * 查询任务列表
   * Phase 2.1: Include relation data
   */
  async findAll(query: TaskQueryDto, userId: string, role: string) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const { status, departmentId } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (role === 'user') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.departmentId) {
        where.departmentId = user.departmentId;
      }
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) {
      where.status = status;
    }

    const [list, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: RELATION_INCLUDES,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  /**
   * 查询单个任务
   * Phase 2.1: Include relation data
   * SEC-NEW-002: Authorization check - non-admin/leader must belong to task's department
   */
  async findOne(id: string, userId?: string, role?: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: RELATION_INCLUDES,
    });

    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }

    if (userId && role && role !== 'admin') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.departmentId !== task.departmentId) {
        throw new BusinessException(
          ErrorCode.FORBIDDEN,
          '您无权查看该任务，只能查看本部门的任务',
        );
      }
    }

    return task;
  }

  /**
   * 取消任务
   * Phase 2.2: Only allow cancel if status === 'pending'
   * Phase 2.4: Notify department members on cancel
   */
  async cancel(id: string, userId: string, role: string) {
    const task = await this.findOne(id);

    if (task.status !== 'pending') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `只能取消待处理的任务，任务 [${task.id}] 当前状态：${task.status}`,
      );
    }

    if (role !== 'admin' && task.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能取消自己创建的任务，任务 [${task.id}] 不属于您`,
      );
    }

    const result = await this.prisma.task.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await this.notifyDepartmentMembers(
      task.departmentId,
      '任务已取消',
      `任务 [${task.id}] 已被取消`,
    );

    return result;
  }

  /**
   * 保存草稿
   * Phase 2.5: Draft (save) API
   */
  async saveDraft(taskId: string, dto: DraftTaskDto, userId: string) {
    const task = await this.findOne(taskId);

    if (task.status !== 'pending') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `只能为待处理的任务保存草稿，任务 [${task.id}] 当前状态：${task.status}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.departmentId !== task.departmentId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        '您不属于该任务的目标部门，无法保存草稿',
      );
    }

    return this.prisma.taskRecord.upsert({
      where: {
        id: `draft-${taskId}-${userId}`,
      },
      create: {
        id: `draft-${taskId}-${userId}`,
        taskId,
        templateId: task.templateId,
        dataJson: (dto.data || {}) as any,
        submitterId: userId,
        status: 'pending',
      },
      update: {
        dataJson: (dto.data || {}) as any,
      },
    });
  }

  /**
   * 提交任务记录
   * BR-014: 任务第一人提交后，其他人不能再提交
   * Phase 2.6: Field validation
   * Phase 2.8: Department membership check
   */
  async submit(dto: SubmitTaskDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const task = await this.validateTaskForSubmit(tx, dto.taskId);
      const template = await this.getTemplate(tx, task.templateId);

      await this.validateDepartmentMembership(
        tx,
        userId,
        task.departmentId,
      );

      this.validateFields(
        template.fieldsJson as any[],
        dto.data || {},
      );

      const deviations = this.deviationService.detectDeviations(
        template.fieldsJson as any[],
        dto.data || {},
      );

      const record = await this.createTaskRecord(
        tx,
        dto,
        userId,
        template.version,
        deviations.length,
      );

      if (deviations.length > 0) {
        await this.deviationService.createDeviationReports(
          record.id,
          template.id,
          deviations,
          dto.deviationReasons || {},
          userId,
        );
      }

      await tx.task.update({
        where: { id: dto.taskId },
        data: { status: 'submitted' },
      });

      return record;
    }, {
      isolationLevel: 'Serializable',
    });
  }

  /**
   * 更新任务
   * Phase 2.10: Update deadline/departmentId for pending tasks
   */
  async update(
    id: string,
    dto: UpdateTaskDto,
    userId: string,
    role: string,
  ) {
    const task = await this.findOne(id);

    if (task.status !== 'pending') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `只能更新待处理的任务，任务 [${task.id}] 当前状态：${task.status}`,
      );
    }

    if (role !== 'admin' && task.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能更新自己创建的任务，任务 [${task.id}] 不属于您`,
      );
    }

    const updateData: any = {};

    if (dto.deadline) {
      updateData.deadline = new Date(dto.deadline);
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });

      if (!department) {
        throw new BusinessException(
          ErrorCode.NOT_FOUND,
          '目标部门不存在',
        );
      }

      updateData.departmentId = dto.departmentId;
    }

    return this.prisma.task.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * 审批任务记录
   */
  async approve(dto: ApproveTaskDto, userId: string) {
    const record = await this.prisma.taskRecord.findUnique({
      where: { id: dto.recordId },
    });

    if (!record) {
      throw new BusinessException(ErrorCode.NOT_FOUND, `任务记录 [${dto.recordId}] 不存在`);
    }

    if (record.status !== 'submitted') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `任务记录 [${dto.recordId}] 已审批，当前状态：${record.status}`,
      );
    }

    if (record.submitterId === userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        '不能审批自己提交的记录',
      );
    }

    const approver = await this.prisma.user.findUnique({ where: { id: userId } });
    const submitter = record.submitterId
      ? await this.prisma.user.findUnique({ where: { id: record.submitterId } })
      : null;

    if (!approver) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '审批人不存在');
    }

    const isAdmin = approver.role === 'admin';
    const isSuperior = submitter?.superiorId === userId;
    const isSameDepartmentLeader =
      approver.role === 'leader' && submitter?.departmentId === approver.departmentId;

    if (!isAdmin && !isSuperior && !isSameDepartmentLeader) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `您无权审批任务记录 [${dto.recordId}]，只有提交人的上级或同部门领导可以审批`,
      );
    }

    await this.prisma.taskRecord.update({
      where: { id: dto.recordId },
      data: {
        status: dto.status,
        approverId: userId,
        approvedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * 查询待审批记录
   * SEC-001: Role-based filtering to prevent authorization bypass
   */
  async findPendingApprovals(
    userId: string,
    role: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      status: 'submitted',
      deletedAt: null,
    };

    if (role === 'admin') {
      return this.queryPendingApprovals(where, skip, limit, page);
    }

    if (role === 'leader') {
      const leader = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!leader || !leader.departmentId) {
        return { list: [], total: 0, page, limit };
      }

      const leaderWhere = {
        ...where,
        submitter: { departmentId: leader.departmentId },
      };

      return this.queryPendingApprovals(leaderWhere, skip, limit, page);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subordinates: { select: { id: true } } },
    });

    if (!user || !user.subordinates || user.subordinates.length === 0) {
      return { list: [], total: 0, page, limit };
    }

    const subordinateIds = user.subordinates.map(
      (sub: { id: string }) => sub.id,
    );

    const userWhere = {
      ...where,
      submitterId: { in: subordinateIds },
    };

    return this.queryPendingApprovals(userWhere, skip, limit, page);
  }

  /**
   * 导出任务到 Excel
   * TASK-048: 导出任务列表为Excel文件
   */
  async exportToExcel(query: ExportTaskDto, userId: string, role: string): Promise<Buffer> {
    const where: any = { deletedAt: null };

    if (role === 'user') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.departmentId) {
        where.departmentId = user.departmentId;
      }
    } else if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: RELATION_INCLUDES,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('任务列表');

    worksheet.columns = [
      { header: '任务ID', key: 'id', width: 36 },
      { header: '模板名称', key: 'templateTitle', width: 30 },
      { header: '执行部门', key: 'departmentName', width: 20 },
      { header: '截止时间', key: 'deadline', width: 20 },
      { header: '状态', key: 'status', width: 15 },
      { header: '创建人', key: 'creatorName', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const statusMap: Record<string, string> = {
      pending: '待处理',
      submitted: '已提交',
      approved: '已通过',
      rejected: '已拒绝',
      cancelled: '已取消',
      overdue: '已逾期',
    };

    for (const task of tasks) {
      worksheet.addRow({
        id: task.id,
        templateTitle: task.template?.title || '-',
        departmentName: task.department?.name || '-',
        deadline: task.deadline ? new Date(task.deadline).toLocaleString('zh-CN') : '-',
        status: statusMap[task.status] || task.status,
        creatorName: task.creator?.name || task.creator?.username || '-',
        createdAt: task.createdAt ? new Date(task.createdAt).toLocaleString('zh-CN') : '-',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  private async notifyDepartmentMembers(
    departmentId: string,
    title: string,
    content: string,
  ) {
    try {
      const members = await this.prisma.user.findMany({
        where: { departmentId, status: 'active' },
        select: { id: true },
      });

      if (members.length === 0) {
        return;
      }

      const notifications = members.map((member) => ({
        userId: member.id,
        type: 'task',
        title,
        content,
      }));

      await this.notificationService.createMany(notifications);
    } catch (error) {
      this.logger.warn(`Notification delivery failed for department ${departmentId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateTaskForSubmit(tx: any, taskId: string) {
    const task = await tx.task.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }

    if (task.status !== 'pending') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `任务 [${task.id}] 已结束，不能提交，当前状态：${task.status}`,
      );
    }

    const existingRecord = await tx.taskRecord.findFirst({
      where: {
        taskId,
        status: { in: ['submitted', 'approved'] },
        deletedAt: null,
      },
    });

    if (existingRecord) {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        '该任务已被其他人提交，不能重复提交',
      );
    }

    return task;
  }

  private async getTemplate(tx: any, templateId: string) {
    const template = await tx.template.findUnique({
      where: { id: templateId, deletedAt: null },
    });

    if (!template) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '模板不存在');
    }

    return template;
  }

  /**
   * Phase 2.8: Validate user belongs to task's department
   */
  private async validateDepartmentMembership(
    tx: any,
    userId: string,
    departmentId: string,
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.departmentId !== departmentId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        '您不属于该任务的目标部门，无法提交',
      );
    }
  }

  /**
   * Phase 2.6: Validate field data against template rules
   */
  private validateFields(
    templateFields: any[],
    data: Record<string, unknown>,
  ) {
    const errors: FieldValidationError[] = [];

    for (const field of templateFields) {
      const value = data[field.name];

      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.name,
          message: `字段 [${field.name}] 为必填项`,
        });
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      if (field.type === 'number') {
        const numValue = Number(value);
        if (field.min !== undefined && numValue < field.min) {
          errors.push({
            field: field.name,
            message: `字段 [${field.name}] 值 ${numValue} 小于最小值 ${field.min}`,
          });
        }
        if (field.max !== undefined && numValue > field.max) {
          errors.push({
            field: field.name,
            message: `字段 [${field.name}] 值 ${numValue} 大于最大值 ${field.max}`,
          });
        }
      }

      if (field.type === 'text') {
        const strValue = String(value);
        if (field.minLength !== undefined && strValue.length < field.minLength) {
          errors.push({
            field: field.name,
            message: `字段 [${field.name}] 长度 ${strValue.length} 小于最小长度 ${field.minLength}`,
          });
        }
        if (field.maxLength !== undefined && strValue.length > field.maxLength) {
          errors.push({
            field: field.name,
            message: `字段 [${field.name}] 长度 ${strValue.length} 大于最大长度 ${field.maxLength}`,
          });
        }
        if (field.pattern) {
          if (!safe(field.pattern)) {
            errors.push({
              field: field.name,
              message: `字段 [${field.name}] 的正则表达式不安全（可能导致性能问题）`,
            });
          } else {
            try {
              const regex = new RegExp(field.pattern);
              if (!regex.test(strValue)) {
                errors.push({
                  field: field.name,
                  message: `字段 [${field.name}] 不符合格式要求`,
                });
              }
            } catch {
              errors.push({
                field: field.name,
                message: `字段 [${field.name}] 的正则表达式无效`,
              });
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        `表单验证失败：${errors.map((e) => e.message).join('；')}`,
        errors,
      );
    }
  }

  private async createTaskRecord(
    tx: any,
    dto: SubmitTaskDto,
    userId: string,
    templateVersion: any,
    deviationCount: number,
  ) {
    return tx.taskRecord.create({
      data: {
        id: crypto.randomUUID(),
        taskId: dto.taskId,
        templateId: (await tx.task.findUnique({ where: { id: dto.taskId } })).templateId,
        dataJson: (dto.data || {}) as any,
        submitterId: userId,
        status: 'submitted',
        submittedAt: new Date(),
        relatedTemplateVersion: templateVersion,
        hasDeviation: deviationCount > 0,
        deviationCount,
      },
    });
  }

  private async queryPendingApprovals(
    where: Record<string, unknown>,
    skip: number,
    take: number,
    page: number,
  ) {
    const [list, total] = await Promise.all([
      this.prisma.taskRecord.findMany({
        where,
        skip,
        take,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.taskRecord.count({ where }),
    ]);

    return { list, total, page, limit: take };
  }
}
