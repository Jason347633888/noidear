import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TodoCard from '../TodoCard.vue';

describe('TodoCard', () => {
  const mockTodo = {
    id: '1',
    title: '完成培训计划审批',
    type: 'approval' as const,
    status: 'pending' as const,
    priority: 'high' as const,
    dueDate: '2026-02-20',
    businessId: '123',
    businessType: 'training_project',
    isOverdue: false,
  };

  const createWrapper = (props = {}) => {
    return mount(TodoCard, {
      props: {
        todo: mockTodo,
        ...props,
      },
      global: {
        stubs: {
          ElCard: true,
          ElTag: true,
          ElIcon: true,
        },
      },
    });
  };

  it('should mount successfully', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('should display todo title', () => {
    const wrapper = createWrapper();
    expect(wrapper.text()).toContain('完成培训计划审批');
  });

  it('should apply overdue class when todo is overdue', () => {
    const wrapper = createWrapper({
      todo: { ...mockTodo, isOverdue: true },
    });
    expect(wrapper.classes()).toContain('overdue');
  });
});
