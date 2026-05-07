import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MyTodos from '@/views/my-todos/MyTodos.vue';

const push = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/stores/todo', () => ({
  useTodoStore: () => ({ refreshPendingCount: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/api/todo', () => ({
  todoApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        { id: 'todo-1', type: 'approval', status: 'pending', priority: 'urgent', title: '待审批任务', description: '今天必须处理', relatedId: '1', actionRoute: '/approvals/pending', dueDate: '2026-05-08T00:00:00.000Z', createdAt: '2026-05-07T00:00:00.000Z', completedAt: null, completedBy: null },
      ],
      total: 1, page: 1, limit: 20, hasMore: false,
    }),
    complete: vi.fn(),
  },
}));

describe('MyTodos', () => {
  it('renders the shared execution header and priority-aware table copy', async () => {
    const wrapper = mount(MyTodos, {
      global: {
        stubs: ['el-card', 'el-button', 'el-select', 'el-option', 'el-pagination', 'el-tag', 'el-table', 'el-table-column', 'el-tooltip', 'PageHeaderBlock'],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('我的待办');
    expect(wrapper.text()).toContain('优先清理到期和高风险事项');
    expect(wrapper.text()).toContain('待审批任务');
  });
});
