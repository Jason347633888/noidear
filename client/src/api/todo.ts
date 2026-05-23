import request from './request';
import type { TodoListQuery, TodoListResponse, TodoStatisticsResponse, TodoItem } from '@/types/todo';

export const todoApi = {
  list(query: TodoListQuery): Promise<TodoListResponse> {
    return request.get('/todos', { params: query });
  },

  statistics(): Promise<TodoStatisticsResponse> {
    return request.get('/todos/statistics', { _silent: true } as any);
  },

  complete(id: string): Promise<TodoItem> {
    return request.post(`/todos/${id}/complete`);
  },
};
