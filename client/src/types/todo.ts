export type TodoStatus = 'pending' | 'completed';
export type TodoPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TodoType =
  | 'training_attend'
  | 'training_organize'
  | 'approval'
  | 'audit_rectification'
  | 'equipment_maintain'
  | 'inventory'
  | 'change_request';

export interface TodoItem {
  id: string;
  type: TodoType;
  status: TodoStatus;
  priority: TodoPriority;
  title: string;
  description: string | null;
  relatedId: string;
  actionRoute: string | null;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  completedBy: string | null;
}

export interface TodoListResponse {
  items: TodoItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TodoStatisticsResponse {
  total: number;
  byType: Partial<Record<TodoType, number>>;
  byStatus: { pending: number; completed: number };
}

export interface TodoListQuery {
  status?: 'all' | TodoStatus;
  type?: 'all' | TodoType;
  page?: number;
  limit?: number;
}
