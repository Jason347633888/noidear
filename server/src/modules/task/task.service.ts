import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviationService } from '../deviation/deviation.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreateTaskDto, TaskQueryDto, SubmitTaskDto, ApproveTaskDto } from './dto';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deviationService: DeviationService,
  ) {}

  /**
   * 创建任务
   */
  async create(dto: CreateTaskDto, userId: string) {
    return this.prisma.task.create({
      data: {
        id: crypto.randomUUID(),
        templateId: dto.templateId,
        departmentId: dto.departmentId,
        deadline: new Date(dto.deadline),
        creatorId: userId,
      },
    });
  }

  /**
   * 查询任务列表
   */
  async findAll(query: TaskQueryDto, userId: string, role: string) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status, departmentId } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = { deletedAt: null };

    // 普通用户只能看到本部门的任务
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
      }),
      this.prisma.task.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  /**
   * 查询单个任务
   */
  async findOne(id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!task) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务不存在');
    }

    return task;
  }

  /**
   * 取消任务
   */
  async cancel(id: string, userId: string, role: string) {
    const task = await this.findOne(id);

    if (role !== 'admin' && task.creatorId !== userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `只能取消自己创建的任务，任务 [${task.id}] 不属于您`,
      );
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  /**
   * 提交任务记录
   * 使用事务和行锁防止重复提交（BR-014：任务第一人提交后，其他人不能再提交）
   */
  async submit(dto: SubmitTaskDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const task = await this.validateTaskForSubmit(tx, dto.taskId);
      const template = await this.getTemplate(tx, task.templateId);

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

    // 权限验证：必须是提交人的上级或管理员
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
   */
  async findPendingApprovals(userId: string, role: string) {
    const where: Record<string, unknown> = { status: 'submitted', deletedAt: null };

    return this.prisma.taskRecord.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
    });
  }
}
