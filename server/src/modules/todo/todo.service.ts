import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryTodoDto } from './dto/query-todo.dto';

@Injectable()
export class TodoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询我的待办列表
   * BR-111: 待办任务逾期提醒（逾期待办优先显示）
   */
  async findMyTodos(dto: QueryTodoDto, userId: string) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;
    const where = this.buildQueryWhere(dto, userId);

    const [items, total] = await Promise.all([
      this.prisma.todoTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { dueDate: 'asc' }, // 截止日期升序（逾期的在前面）
          { priority: 'desc' }, // 优先级降序
          { createdAt: 'desc' }, // 创建时间降序
        ],
      }),
      this.prisma.todoTask.count({ where }),
    ]);

    // 标记逾期待办
    const now = new Date();
    const itemsWithOverdue = items.map(item => ({
      ...item,
      isOverdue: item.dueDate && item.dueDate < now && item.status === 'pending',
    }));

    return {
      items: itemsWithOverdue,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 查询待办详情
   */
  async findTodoById(id: string, userId: string) {
    const todo = await this.prisma.todoTask.findUnique({
      where: { id },
    });

    if (!todo) {
      throw new NotFoundException('待办任务不存在');
    }

    // 权限校验：只能查看自己的待办
    if (todo.userId !== userId) {
      throw new ForbiddenException('无权查看该待办任务');
    }

    // 获取关联业务信息
    const relatedInfo = await this.getRelatedInfo(todo.type, todo.relatedId);

    return {
      ...todo,
      relatedInfo,
    };
  }

  /**
   * 完成待办
   */
  async completeTodo(id: string, userId: string) {
    const todo = await this.prisma.todoTask.findUnique({
      where: { id },
    });

    if (!todo) {
      throw new NotFoundException('待办任务不存在');
    }

    // 权限校验：只能完成自己的待办
    if (todo.userId !== userId) {
      throw new ForbiddenException('无权完成该待办任务');
    }

    if (todo.status === 'completed') {
      throw new BadRequestException('该待办任务已完成');
    }

    return this.prisma.todoTask.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  /**
   * 删除待办
   * BR-110: 待办任务删除规则（只能删除 pending 状态）
   */
  async deleteTodo(id: string, userId: string) {
    const todo = await this.prisma.todoTask.findUnique({
      where: { id },
    });

    if (!todo) {
      throw new NotFoundException('待办任务不存在');
    }

    // 权限校验：只能删除自己的待办
    if (todo.userId !== userId) {
      throw new ForbiddenException('无权删除该待办任务');
    }

    // BR-110: 只能删除 pending 状态的待办
    if (todo.status !== 'pending') {
      throw new BadRequestException('只能删除待处理状态的待办任务');
    }

    await this.prisma.todoTask.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 待办类型统计
   */
  async getTodoStatistics(userId: string) {
    const todos = await this.prisma.todoTask.findMany({
      where: { userId },
      select: {
        type: true,
        status: true,
      },
    });

    // 按类型分组统计
    const typeStats = todos.reduce((acc, todo) => {
      const key = todo.type;
      if (!acc[key]) {
        acc[key] = { total: 0, pending: 0, completed: 0 };
      }
      acc[key].total++;
      if (todo.status === 'pending') {
        acc[key].pending++;
      } else {
        acc[key].completed++;
      }
      return acc;
    }, {} as Record<string, { total: number; pending: number; completed: number }>);

    // 总体统计
    const totalPending = todos.filter(t => t.status === 'pending').length;
    const totalCompleted = todos.filter(t => t.status === 'completed').length;

    return {
      total: todos.length,
      pending: totalPending,
      completed: totalCompleted,
      byType: typeStats,
    };
  }

  // ==================== Private Helper Methods ====================

  private buildQueryWhere(dto: QueryTodoDto, userId: string) {
    const where: any = { userId };

    if (dto.type) {
      where.type = dto.type;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.priority) {
      where.priority = dto.priority;
    }

    return where;
  }

  /**
   * 获取关联业务信息
   */
  private async getRelatedInfo(type: string, relatedId: string) {
    try {
      switch (type) {
        case 'training_organize':
        case 'training_attend':
          return await this.prisma.trainingProject.findUnique({
            where: { id: relatedId },
            select: {
              id: true,
              title: true,
              scheduledDate: true,
              status: true,
            },
          });

        case 'approval':
          // 工作流任务
          return await this.prisma.workflowTask.findUnique({
            where: { id: relatedId },
            select: {
              id: true,
              instanceId: true,
              status: true,
            },
          });

        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }
}
