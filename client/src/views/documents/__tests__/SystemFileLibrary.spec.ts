import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockListDocuments = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listDocuments: (...args: unknown[]) => mockListDocuments(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}));

const stubs = {
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-tag': { template: '<span><slot /></span>' },
};

import SystemFileLibrary from '../SystemFileLibrary.vue';

describe('SystemFileLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListDocuments.mockResolvedValue({ list: [], total: 0, page: 1, limit: 50 });
  });

  it('loads documents on mount', async () => {
    mount(SystemFileLibrary, { global: { stubs } });
    await flushPromises();
    expect(mockListDocuments).toHaveBeenCalled();
  });

  it('filters by selected source folder', async () => {
    const wrapper = mount(SystemFileLibrary, { global: { stubs } });
    await flushPromises();
    await (wrapper.vm as any).selectFolder('02');
    expect(mockListDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ sourceFolder: '02' }));
  });
});
