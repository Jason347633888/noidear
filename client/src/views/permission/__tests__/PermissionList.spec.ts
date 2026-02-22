import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/permissions' }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<div><slot /></div>', props: ['model'] },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-select': { template: '<select v-model="modelValue" />', props: ['modelValue'] },
  'el-option': { template: '<option />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-pagination': { template: '<div />' },
  PermissionForm: { template: '<div />' },
};

import PermissionList from '../PermissionList.vue';

const mockPerm = {
  id: 'perm-1',
  resource: 'document',
  action: 'create',
  description: '创建文档',
  createdAt: '2026-01-15T10:00:00Z',
};

const w = () => mount(PermissionList, { global: { stubs } });

describe('PermissionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ list: [], total: 0 });
  });

  it('renders title', async () => {
    const wrapper = w();
    await flushPromises();
    expect(wrapper.text()).toContain('权限列表');
  });

  it('calls API on mount', async () => {
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/permissions', expect.any(Object));
  });

  it('stores data', async () => {
    mockGet.mockResolvedValue({ list: [mockPerm], total: 1 });
    const wrapper = w();
    await flushPromises();
    expect((wrapper.vm as any).tableData).toHaveLength(1);
  });

  it('filter by resource', async () => {
    const wrapper = w();
    await flushPromises();
    (wrapper.vm as any).filterForm.resource = 'document';
    await (wrapper.vm as any).handleSearch();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/permissions', 
      expect.objectContaining({ params: expect.objectContaining({ resource: 'document' }) })
    );
  });

  it('reset form', async () => {
    const wrapper = w();
    await flushPromises();
    (wrapper.vm as any).filterForm.resource = 'document';
    (wrapper.vm as any).handleReset();
    expect((wrapper.vm as any).filterForm.resource).toBe('');
  });

  it('label mapping', async () => {
    const wrapper = w();
    await flushPromises();
    const vm = wrapper.vm as any;
    expect(vm.getResourceLabel('document')).toBe('文档管理');
    expect(vm.getActionLabel('create')).toBe('创建');
  });

  it('delete permission', async () => {
    const { ElMessageBox } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockDelete.mockResolvedValue({});
    const wrapper = w();
    await flushPromises();
    await (wrapper.vm as any).handleDelete(mockPerm);
    await flushPromises();
    expect(mockDelete).toHaveBeenCalledWith(`/permissions/${mockPerm.id}`);
  });

  it('error handling', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue(new Error('error'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalled();
  });
});
