import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();

vi.mock('@/api/request', () => ({
  default: { get: (...a: unknown[]) => mockGet(...a) },
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/permissions/audit-log' }),
}));
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('dayjs', () => {
  const fn = (d: string) => ({ format: () => d ? '2024-01-01 00:00:00' : '' });
  return { default: fn };
});

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<form><slot /></form>', props: ['model', 'inline'] },
  'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-input': {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'clearable'],
    emits: ['update:modelValue'],
  },
  'el-select': {
    template: '<select><slot /></select>',
    props: ['modelValue', 'clearable'],
    emits: ['update:modelValue'],
  },
  'el-option': { template: '<option />', props: ['value', 'label'] },
  'el-date-picker': {
    template: '<input type="text" />',
    props: ['modelValue', 'type', 'valueFormat'],
    emits: ['update:modelValue'],
  },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />', props: ['prop', 'label', 'width'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'size'] },
  'el-pagination': {
    template: '<div class="el-pagination" />',
    props: ['currentPage', 'pageSize', 'total', 'pageSizes', 'layout'],
    emits: ['update:currentPage', 'update:pageSize', 'size-change', 'current-change'],
  },
};

import PermissionAuditLog from '../PermissionAuditLog.vue';

const mockLogs = [
  {
    id: 'log-1',
    createdAt: '2024-01-01T00:00:00.000Z',
    operator: { id: 'u-1', name: '张三', username: 'zhangsan' },
    action: 'grant',
    targetUser: { id: 'u-2', name: '李四' },
    targetDept: null,
    resource: 'document',
    permissionAction: 'read',
    detail: '授予文档查看权限',
    result: 'success' as const,
  },
  {
    id: 'log-2',
    createdAt: '2024-01-02T00:00:00.000Z',
    operator: { id: 'u-1', name: '张三', username: 'zhangsan' },
    action: 'revoke',
    targetUser: null,
    targetDept: { id: 'd-1', name: '研发部' },
    resource: 'task',
    permissionAction: 'delete',
    detail: '撤销任务删除权限',
    result: 'failure' as const,
  },
];

const w = () => mount(PermissionAuditLog, { global: { stubs } });

describe('PermissionAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ list: [], total: 0 });
  });

  it('renders without error', async () => {
    const c = w();
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('fetches audit logs on mount', async () => {
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/permission-audit-logs', expect.any(Object));
  });

  it('stores audit log data', async () => {
    mockGet.mockResolvedValue({ list: mockLogs, total: 2 });
    const c = w();
    await flushPromises();
    expect((c.vm as any).tableData).toHaveLength(2);
    expect((c.vm as any).pagination.total).toBe(2);
  });

  it('shows error when fetch fails', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue(new Error('Network error'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalledWith('获取审计日志失败');
  });

  it('handleSearch resets page to 1 and fetches data', async () => {
    mockGet.mockResolvedValue({ list: mockLogs, total: 2 });
    const c = w();
    await flushPromises();

    (c.vm as any).pagination.page = 3;
    mockGet.mockClear();
    await (c.vm as any).handleSearch();
    await flushPromises();

    expect((c.vm as any).pagination.page).toBe(1);
    expect(mockGet).toHaveBeenCalledWith('/permission-audit-logs', expect.any(Object));
  });

  it('handleReset clears filter form and fetches data', async () => {
    const c = w();
    await flushPromises();

    (c.vm as any).filterForm.username = 'test';
    (c.vm as any).filterForm.action = 'grant';
    (c.vm as any).filterForm.dateRange = ['2024-01-01', '2024-01-31'];
    mockGet.mockClear();

    await (c.vm as any).handleReset();
    await flushPromises();

    expect((c.vm as any).filterForm.username).toBe('');
    expect((c.vm as any).filterForm.action).toBe('');
    expect((c.vm as any).filterForm.dateRange).toBeNull();
    expect(mockGet).toHaveBeenCalled();
  });

  it('sends username filter param when set', async () => {
    const c = w();
    await flushPromises();

    (c.vm as any).filterForm.username = 'zhangsan';
    mockGet.mockClear();
    mockGet.mockResolvedValue({ list: [], total: 0 });
    await (c.vm as any).handleSearch();
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith(
      '/permission-audit-logs',
      expect.objectContaining({ params: expect.objectContaining({ username: 'zhangsan' }) }),
    );
  });

  it('sends action filter param when set', async () => {
    const c = w();
    await flushPromises();

    (c.vm as any).filterForm.action = 'grant';
    mockGet.mockClear();
    mockGet.mockResolvedValue({ list: [], total: 0 });
    await (c.vm as any).handleSearch();
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith(
      '/permission-audit-logs',
      expect.objectContaining({ params: expect.objectContaining({ action: 'grant' }) }),
    );
  });

  it('sends date range params when set', async () => {
    const c = w();
    await flushPromises();

    (c.vm as any).filterForm.dateRange = ['2024-01-01', '2024-01-31'];
    mockGet.mockClear();
    mockGet.mockResolvedValue({ list: [], total: 0 });
    await (c.vm as any).handleSearch();
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith(
      '/permission-audit-logs',
      expect.objectContaining({
        params: expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
      }),
    );
  });

  it('exports logs and shows success message', async () => {
    const { ElMessage } = await import('element-plus');
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    // Create a proper anchor element mock
    const linkEl = document.createElement('a');
    const clickMock = vi.fn();
    linkEl.click = clickMock;
    vi.spyOn(document, 'createElement').mockReturnValueOnce(linkEl);

    mockGet.mockImplementation((url: string) => {
      if (url === '/permission-audit-logs/export') return Promise.resolve(new Blob(['data']));
      return Promise.resolve({ list: [], total: 0 });
    });

    const c = w();
    await flushPromises();
    await (c.vm as any).handleExport();
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith(
      '/permission-audit-logs/export',
      expect.objectContaining({ responseType: 'blob' }),
    );
    expect(ElMessage.success).toHaveBeenCalledWith('导出成功');
  });

  it('shows error when export fails', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockImplementation((url: string) => {
      if (url === '/permission-audit-logs/export') return Promise.reject(new Error('Export error'));
      return Promise.resolve({ list: [], total: 0 });
    });
    const c = w();
    await flushPromises();
    await (c.vm as any).handleExport();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalledWith('导出失败');
  });
});
