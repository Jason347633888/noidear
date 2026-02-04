import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreateTaskDto, TaskQueryDto, SubmitTaskDto, ApproveTaskDto } from './dto';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

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
      // 锁定任务行，防止并发问题
      const task = await tx.task.findUnique({
        where: { id: dto.taskId, deletedAt: null },
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

      // 检查是否已有人提交过此任务（防止重复提交）
      const existingRecord = await tx.taskRecord.findFirst({
        where: {
          taskId: dto.taskId,
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

      // 创建任务记录
      const record = await tx.taskRecord.create({
        data: {
          id: crypto.randomUUID(),
          taskId: dto.taskId,
          templateId: task.templateId,
          dataJson: (dto.data || {}) as any,
          submitterId: userId,
          status: 'submitted',
          submittedAt: new Date(),
        },
      });

      // 更新任务状态为已提交，防止其他人继续提交
      await tx.task.update({
        where: { id: dto.taskId },
        data: { status: 'submitted' },
      });

      return record;
    }, {
      isolationLevel: 'Serializable', // 使用最高隔离级别防止竞态条件
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
