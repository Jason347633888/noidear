import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/api/request', () => ({
  default: { get: (...a: unknown[]) => mockGet(...a), put: (...a: unknown[]) => mockPut(...a) },
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/permissions/fine-grained' }),
}));
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-select': { template: '<select v-model="modelValue" />', props: ['modelValue'] },
  'el-option': { template: '<option />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-checkbox': { template: '<input type="checkbox" v-model="modelValue" />', props: ['modelValue', 'disabled'] },
  'el-empty': { template: '<div class="el-empty" />' },
  'el-divider': { template: '<hr />' },
  'el-tag': { template: '<span><slot /></span>' },
};

import FineGrainedPermission from '../FineGrainedPermission.vue';

const mockRoles = [{ id: 'r-1', name: '管理员', description: '管理员角色' }];
const mockPermissions = { permissions: [{ resource: 'document', action: 'read' }, { resource: 'template', action: 'create' }] };

const w = () => mount(FineGrainedPermission, { global: { stubs } });

describe('FineGrainedPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ list: [] });
  });

  it('renders without error', async () => {
    const c = w();
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('fetches roles on mount', async () => {
    mockGet.mockResolvedValue({ list: mockRoles });
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/roles', expect.any(Object));
  });

  it('stores roles data', async () => {
    mockGet.mockResolvedValue({ list: mockRoles });
    const c = w();
    await flushPromises();
    expect((c.vm as any).roles).toHaveLength(1);
  });

  it('matrix initializes to false by default', async () => {
    const c = w();
    await flushPromises();
    const matrix = (c.vm as any).matrix;
    expect(matrix.document.read).toBe(false);
    expect(matrix.template.create).toBe(false);
  });

  it('handleSelectAll sets all matrix to true', async () => {
    const c = w();
    await flushPromises();
    (c.vm as any).selectedRoleId = 'r-1';
    (c.vm as any).handleSelectAll();
    const matrix = (c.vm as any).matrix;
    expect(matrix.document.read).toBe(true);
    expect(matrix.document.create).toBe(true);
  });

  it('handleClearAll sets all matrix to false', async () => {
    const c = w();
    await flushPromises();
    (c.vm as any).selectedRoleId = 'r-1';
    (c.vm as any).handleSelectAll();
    (c.vm as any).handleClearAll();
    expect((c.vm as any).matrix.document.read).toBe(false);
  });

  it('fetches role permissions when role selected', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/roles') return Promise.resolve({ list: mockRoles });
      return Promise.resolve(mockPermissions);
    });
    const c = w();
    await flushPromises();
    mockGet.mockClear();
    mockGet.mockResolvedValue(mockPermissions);
    await (c.vm as any).handleRoleChange('r-1');
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/fine-grained-permissions/role/r-1');
  });

  it('changedCount is 0 when no changes made', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).changedCount).toBe(0);
  });

  it('shows info when save called with no changes', async () => {
    const { ElMessage } = await import('element-plus');
    const c = w();
    await flushPromises();
    (c.vm as any).selectedRoleId = 'r-1';
    await (c.vm as any).handleSave();
    expect(ElMessage.info).toHaveBeenCalledWith('没有变更需要保存');
  });
});
