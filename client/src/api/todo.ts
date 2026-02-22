import request from './request';
import type {
  TodoTask,
  TodoStatistics,
  TodoTaskQueryDto,
  PaginatedResponse,
} from '@/types/training';

// =========================================================================
// Todo Task APIs
// =========================================================================

/**
 * Get my todo list with pagination and filters
 */
export const getTodoTasks = (params?: TodoTaskQueryDto): Promise<PaginatedResponse<TodoTask>> => {
  return request.get('/todos', { params });
};

/**
 * Get todo task detail by ID
 */
export const getTodoTaskById = (id: string): Promise<TodoTask> => {
  return request.get(`/todos/${id}`);
};

/**
 * Complete todo task
 */
export const completeTodoTask = (id: string): Promise<TodoTask> => {
  return request.post(`/todos/${id}/complete`);
};

/**
 * Delete todo task (pending only)
 */
export const deleteTodoTask = (id: string): Promise<void> => {
  return request.delete(`/todos/${id}`);
};

/**
 * Get todo statistics by type
 */
export const getTodoStatistics = (): Promise<TodoStatistics> => {
  return request.get('/todos/statistics');
};

/**
 * Get unread todo count
 */
export const getUnreadTodoCount = (): Promise<number> => {
  return request.get('/todos/unread-count');
};
