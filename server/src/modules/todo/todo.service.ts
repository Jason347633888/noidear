import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryTodoDto } from './dto/query-todo.dto';
import { TodoType } from '@prisma/client';
import { OwnershipContext } from '../module-access/ownership-context';

const ACTION_ROUTE_MAP: Partial<Record<TodoType, (id: string) => string>> = {
  training_attend: (id) => `/training/projects/${id}`,
  training_organize: (id) => `/training/projects/${id}`,
  approval: (id) => `/approvals/detail/${id}`,
  approval_task: (id) => `/approvals/detail/${id}`,
  equipment_maintain: (id) => `/equipment/${id}`,
  document_renewal: (id) => `/documents/${id}`,
  change_execution_failed: (planId) => `/products/by-plan/${planId}`,
};

const ALL_TODO_TYPES: TodoType[] = [
  'training_attend', 'training_organize', 'approval', 'approval_task',
  'equipment_maintain', 'inventory', 'change_request',
  'document_renewal', 'change_execution_failed',
];

@Injectable()
export class TodoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ownership-scoped findAll — returns paginated response {items, total, page, limit, hasMore}.
   * admin → all todos; leader → todos of members in managed departments; user → own todos.
   */
  async findAll(query: QueryTodoDto, ownership: OwnershipContext) {
    const { status = 'all', type = 'all', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const scopeWhere = await this.buildOwnershipWhere(ownership);
    if (scopeWhere === null) {
      // No accessible users (e.g. leader with empty departments)
      return { items: [], total: 0, page, limit, hasMore: false };
    }

    const where: Record<string, unknown> = { ...scopeWhere };
    if (status !== 'all') where.status = status;
    if (type !== 'all') where.type = type;

    const [rawItems, total] = await Promise.all([
      this.prisma.todoTask.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.todoTask.count({ where }),
    ]);

    const items = rawItems.map((t) => ({
      ...t,
      actionRoute: ACTION_ROUTE_MAP[t.type]?.(t.relatedId) ?? null,
    }));

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  async getStatistics(userId: string) {
    const groups = await this.prisma.todoTask.groupBy({
      by: ['type', 'status'],
      where: { userId },
      _count: { id: true },
    });

    const byType: Partial<Record<TodoType, number>> = Object.fromEntries(
      ALL_TODO_TYPES.map((t) => [t, 0]),
    );
    let pending = 0;
    let completed = 0;

    for (const g of groups) {
      const count = g._count.id;
      byType[g.type] = (byType[g.type] ?? 0) + count;
      if (g.status === 'pending') pending += count;
      else if (g.status === 'completed') completed += count;
    }

    return { total: pending + completed, byType, byStatus: { pending, completed } };
  }

  async complete(id: string, userId: string) {
    const todo = await this.prisma.todoTask.findFirst({ where: { id, userId } });
    if (!todo) throw new NotFoundException('待办不存在');
    if (todo.status !== 'pending') throw new ConflictException('该待办已完成，不可重复操作');
    return this.prisma.todoTask.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date(), completedBy: userId },
    });
  }

  /**
   * Returns the Prisma where clause for ownership scoping.
   * Returns null when no records should be visible (empty scope).
   */
  private async buildOwnershipWhere(
    ownership: OwnershipContext,
  ): Promise<Record<string, unknown> | null> {
    if (ownership.roleCode === 'admin') {
      return {};
    }
    if (ownership.roleCode === 'user') {
      return { userId: ownership.userId };
    }
    // leader: todos of members in managed departments
    const depts = ownership.managedDepartmentIds ?? [];
    if (depts.length === 0) return null;
    const members = await this.prisma.user.findMany({
      where: { departmentId: { in: depts } },
      select: { id: true },
    });
    if (members.length === 0) return null;
    return { userId: { in: members.map((u: { id: string }) => u.id) } };
  }
}
