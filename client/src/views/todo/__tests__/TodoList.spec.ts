import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TodoList from '../TodoList.vue';

vi.mock('@/api/todo', () => ({
  fetchTodos: vi.fn(() => Promise.resolve({ 
    list: [], 
    total: 0,
    statistics: { total: 0, pending: 0, completed: 0, overdue: 0 },
  })),
  completeTodo: vi.fn(),
}));

describe('TodoList', () => {
  const createWrapper = () => {
    return mount(TodoList, {
      global: {
        stubs: {
          ElCard: true,
          ElRow: true,
          ElCol: true,
          ElStatistic: true,
          ElForm: true,
          ElFormItem: true,
          ElSelect: true,
          ElOption: true,
          ElButton: true,
          ElEmpty: true,
          ElPagination: true,
          TodoCard: true,
        },
      },
    });
  };

  it('should mount successfully', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
});
