import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGetMyTasks = vi.fn();
const mockApproveTask = vi.fn();
const mockRejectTask = vi.fn();

vi.mock('@/api/workflow', () => ({
  default: {
    getMyTasks: (...args: unknown[]) => mockGetMyTasks(...args),
    approveTask: (...args: unknown[]) => mockApproveTask(...args),
    rejectTask: (...args: unknown[]) => mockRejectTask(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/workflow/my-tasks' }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<div><slot /></div>', props: ['model', 'inline'] },
  'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue', 'clearable'] },
  'el-option': { template: '<option />', props: ['value', 'label'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' , props: ['type', 'loading', 'link'] },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />', props: ['prop', 'label', 'width', 'fixed'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'size'] },
  'el-pagination': { template: '<div />', props: ['currentPage', 'pageSize', 'total'] },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue', 'title'] },
  'el-input': { template: '<input />', props: ['modelValue', 'type', 'rows', 'placeholder'] },
};

import MyTasks from '../MyTasks.vue';

const mockTasks = [
  { id: 'task-1', instanceId: 'inst-1', stepIndex: 0, status: 'pending', createdAt: '2026-01-15T10:00:00Z' },
  { id: 'task-2', instanceId: 'inst-2', stepIndex: 1, status: 'approved', createdAt: '2026-01-14T10:00:00Z' },
];

const w = () => mount(MyTasks, { global: { stubs } });

describe('MyTasks (Workflow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyTasks.mockResolvedValue({ list: [], total: 0 });
  });

  it('renders without error', async () => {
    const c = w();
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('fetches tasks on mount', async () => {
    w();
    await flushPromises();
    expect(mockGetMyTasks).toHaveBeenCalledWith(expect.any(Object));
  });

  it('stores task data after fetch', async () => {
    mockGetMyTasks.mockResolvedValue({ list: mockTasks, total: 2 });
    const c = w();
    await flushPromises();
    expect((c.vm as any).tableData).toHaveLength(2);
    expect((c.vm as any).pagination.total).toBe(2);
  });

  it('handles fetch error', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetMyTasks.mockRejectedValue(new Error('error'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalled();
  });

  it('taskStatusText returns correct labels', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).taskStatusText('pending')).toBe('待处理');
    expect((c.vm as any).taskStatusText('approved')).toBe('已通过');
    expect((c.vm as any).taskStatusText('rejected')).toBe('已驳回');
  });

  it('taskStatusType returns correct types', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).taskStatusType('pending')).toBe('warning');
    expect((c.vm as any).taskStatusType('approved')).toBe('success');
    expect((c.vm as any).taskStatusType('rejected')).toBe('danger');
  });

  it('handleReset clears filter status', async () => {
    const c = w();
    await flushPromises();
    (c.vm as any).filterForm.status = 'pending';
    (c.vm as any).handleReset();
    expect((c.vm as any).filterForm.status).toBe('');
  });

  it('handleSearch resets page to 1', async () => {
    const c = w();
    await flushPromises();
    (c.vm as any).pagination.page = 3;
    (c.vm as any).handleSearch();
    expect((c.vm as any).pagination.page).toBe(1);
  });

  it('handleApprove opens approve dialog', async () => {
    const c = w();
    await flushPromises();
    const task = mockTasks[0];
    (c.vm as any).handleApprove(task);
    expect((c.vm as any).approveDialogVisible).toBe(true);
    expect((c.vm as any).currentTask).toEqual(task);
  });

  it('handleReject opens reject dialog', async () => {
    const c = w();
    await flushPromises();
    const task = mockTasks[0];
    (c.vm as any).handleReject(task);
    expect((c.vm as any).rejectDialogVisible).toBe(true);
    expect((c.vm as any).currentTask).toEqual(task);
  });

  it('confirmApprove submits approval and closes dialog', async () => {
    const { ElMessage } = await import('element-plus');
    mockApproveTask.mockResolvedValue({});
    const c = w();
    await flushPromises();
    (c.vm as any).currentTask = mockTasks[0];
    (c.vm as any).approveComment = 'agree';
    await (c.vm as any).confirmApprove();
    await flushPromises();
    expect(mockApproveTask).toHaveBeenCalled();
    expect(ElMessage.success).toHaveBeenCalled();
    expect((c.vm as any).approveDialogVisible).toBe(false);
  });

  it('confirmReject submits rejection', async () => {
    const { ElMessage } = await import('element-plus');
    mockRejectTask.mockResolvedValue({});
    const c = w();
    await flushPromises();
    (c.vm as any).currentTask = mockTasks[0];
    (c.vm as any).rejectComment = 'reject reason';
    await (c.vm as any).confirmReject();
    await flushPromises();
    expect(mockRejectTask).toHaveBeenCalled();
    expect(ElMessage.success).toHaveBeenCalled();
  });
});