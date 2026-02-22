import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
  },
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/templates' }),
}));
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<div><slot /></div>', props: ['model'] },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-select': { template: '<select />', props: ['modelValue'] },
  'el-option': { template: '<option />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-pagination': { template: '<div />' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue'] },
};

import TemplateList from '../TemplateList.vue';

const mockTemplate = {
  id: 'tp-1', number: 'TPL-001', title: '巡检模板', level: 1,
  fieldsJson: [{ name: 'f1' }, { name: 'f2' }], status: 'active',
  createdAt: '2026-01-15T10:00:00Z',
};

const w = () => mount(TemplateList, { global: { stubs } });

describe('TemplateList', () => {
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
    expect(mockGet).toHaveBeenCalledWith('/templates', expect.any(Object));
  });

  it('stores template data', async () => {
    mockGet.mockResolvedValue({ list: [mockTemplate], total: 1 });
    const c = w();
    await flushPromises();
    expect((c.vm as any).tableData).toHaveLength(1);
  });

  it('sets pagination total', async () => {
    mockGet.mockResolvedValue({ list: [mockTemplate], total: 10 });
    const c = w();
    await flushPromises();
    expect((c.vm as any).pagination.total).toBe(10);
  });

  it('handles API error', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue(new Error('fetch failed'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalled();
  });

  it('resets filter on handleReset', async () => {
    const c = w();
    await flushPromises();
    const v = c.vm as any;
    v.filterForm.keyword = 'x';
    v.filterForm.status = 'active';
    v.handleReset();
    expect(v.filterForm.keyword).toBe('');
    expect(v.filterForm.status).toBe('');
  });

  it('loading defaults to false after fetch', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).loading).toBe(false);
  });
});
