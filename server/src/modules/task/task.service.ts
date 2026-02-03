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

    return this.prisma.taskRecord.create({
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
  }

  /**
   * 审批任务记录
   */
  async approve(dto: ApproveTaskDto, userId: string) {
    const record = await this.prisma.taskRecord.findUnique({
      where: { id: dto.recordId },
    });

    if (!record) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '记录不存在');
    }

    if (record.status !== 'submitted') {
      throw new BusinessException(ErrorCode.CONFLICT, '记录已审批');
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
