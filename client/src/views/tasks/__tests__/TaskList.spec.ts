import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/request', () => ({
  default: { get: (...a: unknown[]) => mockGet(...a), post: vi.fn() },
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/tasks' }),
}));
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ user: { role: 'admin', id: 'u-1' }, isAdmin: true }),
}));
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-pagination': { template: '<div />' },
  'el-tabs': { template: '<div><slot /></div>', props: ['modelValue'] },
  'el-tab-pane': { template: '<div />' },
  'el-select': { template: '<select />', props: ['modelValue'] },
  'el-option': { template: '<option />' },
  'el-icon': { template: '<i />' },
  Download: { template: '<span />' },
  Plus: { template: '<span />' },
  UserFilled: { template: '<span />' },
};

import TaskList from '../TaskList.vue';

const mockTask = {
  id: 'task-111', templateId: 'tp-1', status: 'pending',
  deadline: '2026-03-01T00:00:00Z', department: { name: '研发部' },
  template: { title: '巡检' }, assignedTo: null, createdAt: '2026-01-15T10:00:00Z',
};

const w = () => mount(TaskList, { global: { stubs } });

describe('TaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ list: [], total: 0 });
  });

  it('renders without error', async () => {
    const c = w();
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('calls API on mount', async () => {
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/tasks', expect.any(Object));
  });

  it('stores task data from API', async () => {
    mockGet.mockResolvedValue({ list: [mockTask], total: 1 });
    const c = w();
    await flushPromises();
    expect((c.vm as any).tableData).toHaveLength(1);
  });

  it('stores total count from API', async () => {
    mockGet.mockResolvedValue({ list: [mockTask], total: 42 });
    const c = w();
    await flushPromises();
    expect((c.vm as any).pagination.total).toBe(42);
  });

  it('handles API error gracefully', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue(new Error('err'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalled();
  });

  it('shows empty list when API returns no tasks', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).tableData).toHaveLength(0);
  });

  it('pagination page defaults to 1', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).pagination.page).toBe(1);
  });

  it('tab change triggers new API request', async () => {
    const c = w();
    await flushPromises();
    const callsBefore = mockGet.mock.calls.length;
    await (c.vm as any).handleTabChange('pending');
    await flushPromises();
    expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('loading state is false after data loaded', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).loading).toBe(false);
  });
});
