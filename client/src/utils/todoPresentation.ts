import type { TodoItem, TodoPriority, TodoType } from '@/types/todo';

export const todoTypeLabels: Record<TodoType, string> = {
  training_attend: '培训参加',
  training_organize: '培训组织',
  approval: '审批',
  audit_rectification: '内审整改',
  equipment_maintain: '设备维护',
  inventory: '盘点',
  change_request: '变更请求',
  approval_task: '审批任务',
};

export const priorityWeights: Record<TodoPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

export const priorityTagTypes: Record<TodoPriority, '' | 'success' | 'warning' | 'danger' | 'info'> = {
  low: 'info',
  normal: '',
  high: 'warning',
  urgent: 'danger',
};

export const priorityText: Record<TodoPriority, string> = {
  low: '低',
  normal: '普通',
  high: '高',
  urgent: '紧急',
};

export function formatDueLabel(dueDate: string | null): string {
  if (!dueDate) return '无截止';
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `已逾期 ${Math.abs(diffDays)} 天`;
  if (diffDays === 0) return '今天到期';
  if (diffDays === 1) return '明天到期';
  return `${diffDays} 天后到期`;
}

export function compareTodosByDueThenRisk(left: TodoItem, right: TodoItem): number {
  const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;
  return priorityWeights[right.priority] - priorityWeights[left.priority];
}
