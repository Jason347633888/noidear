import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '@/views/Dashboard.vue';

const push = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ user: { name: '张三' } }),
}));

vi.mock('@/stores/todo', () => ({
  useTodoStore: () => ({ refreshPendingCount: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/api/todo', () => ({
  todoApi: {
    list: vi.fn(),
    complete: vi.fn(),
  },
}));

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Dashboard', () => {
  it('renders an execution-first queue with overdue items first', async () => {
    const { todoApi } = await import('@/api/todo');
    const request = (await import('@/api/request')).default;

    vi.mocked(todoApi.list)
      .mockResolvedValueOnce({
        items: [
          { id: 'late', type: 'approval', status: 'pending', priority: 'normal', title: '逾期审批', description: null, relatedId: '1', actionRoute: '/approvals/pending', dueDate: '2026-05-01T00:00:00.000Z', createdAt: '2026-05-02T00:00:00.000Z', completedAt: null, completedBy: null },
          { id: 'urgent', type: 'inventory', status: 'pending', priority: 'urgent', title: '高风险盘点', description: null, relatedId: '2', actionRoute: '/my-todos', dueDate: '2026-05-09T00:00:00.000Z', createdAt: '2026-05-02T00:00:00.000Z', completedAt: null, completedBy: null },
        ],
        total: 2, page: 1, limit: 50, hasMore: false,
      })
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 6, hasMore: false });

    vi.mocked(request.get)
      .mockResolvedValueOnce({ list: [] })
      .mockResolvedValueOnce({ list: [] });

    const wrapper = mount(Dashboard, {
      global: {
        stubs: ['el-button', 'el-tag', 'el-empty', 'el-radio-group', 'el-radio-button', 'el-icon'],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('今天先把到期任务清掉');
    const queueText = wrapper.find('.queue-list').text();
    expect(queueText.indexOf('逾期审批')).toBeLessThan(queueText.indexOf('高风险盘点'));
  });
});
