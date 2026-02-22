import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';

type TodoPriority = 'high' | 'medium' | 'low';

interface CreateTodoParams {
  type: 'maintenance_plan' | 'equipment_fault' | 'maintenance_record';
  title: string;
  description?: string;
  assigneeId: string;
  urgency?: string;
  relatedId: string;
}

const URGENCY_MAP: Record<string, TodoPriority> = {
  urgent: 'high',
  normal: 'medium',
  low: 'low',
};

@Injectable()
export class TodoService {
  private readonly logger = new Logger(TodoService.name);

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a todo task notification for an assignee.
   * Integrates with the notification system to alert the responsible person.
   */
  async createTodo(params: CreateTodoParams) {
    const priority = URGENCY_MAP[params.urgency ?? 'normal'] ?? 'medium';

    await this.notificationService.create({
      userId: params.assigneeId,
      type: `todo_${params.type}`,
      title: params.title,
      content: this.buildContent(params, priority),
    });

    this.logger.log(
      `Todo created: type=${params.type}, assignee=${params.assigneeId}, priority=${priority}`,
    );

    return { success: true, type: params.type, priority };
  }

  /**
   * Close a todo task by sending a completion notification.
   */
  async closeTodo(assigneeId: string, type: string, relatedId: string) {
    await this.notificationService.create({
      userId: assigneeId,
      type: `todo_${type}_completed`,
      title: `Task completed: ${type}`,
      content: `Related ID: ${relatedId}`,
    });

    this.logger.log(`Todo closed: type=${type}, relatedId=${relatedId}`);
    return { success: true };
  }

  private buildContent(params: CreateTodoParams, priority: TodoPriority): string {
    const parts = [`Priority: ${priority}`];
    if (params.description) parts.push(params.description);
    parts.push(`Related: ${params.relatedId}`);
    return parts.join(' | ');
  }
}
