import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<div><slot /></div>', props: ['model'] },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': { template: '<input v-model="modelValue" />', props: ['modelValue'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-pagination': { template: '<div />' },
  'el-alert': { template: '<div />' },
  'el-tag': { template: '<span />' },
  PageHeaderBlock: { template: '<div />' },
};

import RoleList from '../RoleList.vue';

const mockRole = {
  id: 'role-1',
  code: 'test_role',
  name: '测试角色',
  description: '测试描述',
  createdAt: '2026-01-15T10:00:00Z',
};

const w = () => mount(RoleList, { global: { stubs } });

describe('RoleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ list: [], total: 0 });
  });

  it('should render title', async () => {
    const wrapper = w();
    await flushPromises();
    expect(wrapper.text()).toContain('角色列表');
  });

  it('calls API on mount', async () => {
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/roles', expect.any(Object));
  });

  it('stores data', async () => {
    mockGet.mockResolvedValue({ list: [mockRole], total: 1 });
    const wrapper = w();
    await flushPromises();
    expect((wrapper.vm as any).tableData).toHaveLength(1);
  });

  it('search keyword', async () => {
    const wrapper = w();
    await flushPromises();

    (wrapper.vm as any).filterForm.keyword = '测试';
    await (wrapper.vm as any).handleSearch();
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith('/roles',
      expect.objectContaining({ params: expect.objectContaining({ keyword: '测试' }) })
    );
  });

  it('reset form', async () => {
    const wrapper = w();
    await flushPromises();
    (wrapper.vm as any).filterForm.keyword = '测试';
    (wrapper.vm as any).handleReset();
    expect((wrapper.vm as any).filterForm.keyword).toBe('');
  });

  it('error handling', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue(new Error('error'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalled();
  });
});
