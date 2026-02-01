import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Snowflake } from '../../common/utils/snowflake';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreateTaskDto, TaskQueryDto, SubmitTaskDto, ApproveTaskDto } from './dto';

@Injectable()
export class TaskService {
  private readonly snowflake: Snowflake;

  constructor(private readonly prisma: PrismaService) {
    this.snowflake = new Snowflake(1, 1);
  }

  /**
   * 创建任务
   */
  async create(dto: CreateTaskDto, userId: string) {
    return this.prisma.task.create({
      data: {
        id: this.snowflake.nextId(),
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
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { status, departmentId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    // 普通用户只能看到本部门的任务
    if (role === 'user') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        where.departmentId = user.departmentId;
      }
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) {
      where.status = status;
    }

    const [list, total] = await Promise.all([
      (this.prisma.task.findMany as any)({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, title: true, fieldsJson: true } },
          department: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  /**
   * 查询单个任务
   */
  async findOne(id: string) {
    const task = await (this.prisma.task.findUnique as any)({
      where: { id, deletedAt: null },
      include: {
        template: true,
        department: true,
        creator: { select: { id: true, name: true } },
        records: {
          include: {
            submitter: { select: { id: true, name: true } },
            approver: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
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
      throw new BusinessException(ErrorCode.FORBIDDEN, '只能取消自己创建的任务');
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  /**
   * 提交任务记录
   */
  async submit(dto: SubmitTaskDto, userId: string) {
    const task = await this.findOne(dto.taskId);

    if (task.status !== 'pending') {
      throw new BusinessException(ErrorCode.CONFLICT, '任务已结束，不能提交');
    }

    return (this.prisma.taskRecord.create as any)({
      data: {
        id: this.snowflake.nextId(),
        taskId: dto.taskId,
        templateId: task.templateId,
        dataJson: dto.data,
        submitterId: userId,
        status: 'submitted',
        submittedAt: new Date(),
      },
    });
  }

  /**
   * 审批任务记录
   */
  async approve(dto: ApproveTaskDto, userId: string) {
    const record = await (this.prisma.taskRecord.findUnique as any)({
      where: { id: dto.recordId },
    });

    if (!record) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '记录不存在');
    }

    if (record.status !== 'submitted') {
      throw new BusinessException(ErrorCode.CONFLICT, '记录已审批');
    }

    await (this.prisma.taskRecord.update as any)({
      where: { id: dto.recordId },
      data: {
        status: dto.status,
        approverId: userId,
        approvedAt: new Date(),
        comment: dto.comment ?? null,
      },
    });

    return { success: true };
  }

  /**
   * 查询待审批记录
   */
  async findPendingApprovals(userId: string, role: string) {
    const where: Record<string, unknown> = { status: 'submitted', deletedAt: null };

    // 部门负责人只能审批本部门的记录
    if (role === 'leader') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        where.task = { departmentId: user.departmentId };
      }
    }

    return (this.prisma.taskRecord.findMany as any)({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        task: { select: { id: true, title: true, template: true } },
        submitter: { select: { id: true, name: true } },
      },
    });
  }
}
