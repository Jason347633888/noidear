import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/api/request', () => ({
  default: { get: (...a: unknown[]) => mockGet(...a), put: (...a: unknown[]) => mockPut(...a) },
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/permissions/department' }),
}));
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<form><slot /></form>', props: ['model'] },
  'el-form-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-select': {
    template: '<select><slot /></select>',
    props: ['modelValue', 'multiple', 'clearable'],
    emits: ['update:modelValue', 'change'],
  },
  'el-option': { template: '<option />', props: ['value', 'label'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-row': { template: '<div><slot /></div>', props: ['gutter'] },
  'el-col': { template: '<div><slot /></div>', props: ['span'] },
  'el-tree': {
    template: '<div class="el-tree"><slot name="default" :node="{label:\'test\'}" :data="data[0]||{}" /></div>',
    props: ['data', 'props', 'highlightCurrent', 'nodeKey'],
    emits: ['node-click'],
  },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />', props: ['prop', 'label', 'width', 'align'] },
  'el-checkbox': {
    template: '<input type="checkbox" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio-group': {
    template: '<div><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio': { template: '<label><slot /></label>', props: ['value'] },
  'el-divider': { template: '<hr />' },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'size'] },
  'el-empty': { template: '<div class="el-empty" />', props: ['description'] },
};

import DepartmentPermission from '../DepartmentPermission.vue';

const mockDepartments = [
  { id: 'd-1', name: '研发部', parentId: null, permissionCount: 0 },
  { id: 'd-2', name: '测试部', parentId: null, permissionCount: 2 },
  { id: 'd-3', name: '前端组', parentId: 'd-1', permissionCount: 0 },
];

const mockDeptPermissions = {
  isolationLevel: 'department',
  allowedDeptIds: ['d-2'],
  resources: [
    { resource: 'document', actions: ['read', 'create'] },
    { resource: 'task', actions: ['read'] },
  ],
};

const w = () => mount(DepartmentPermission, { global: { stubs } });

describe('DepartmentPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ list: [] });
    mockPut.mockResolvedValue({});
  });

  it('renders without error', async () => {
    const c = w();
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('fetches departments on mount', async () => {
    mockGet.mockResolvedValue({ list: mockDepartments });
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/departments', expect.any(Object));
  });

  it('stores departments data', async () => {
    mockGet.mockResolvedValue({ list: mockDepartments });
    const c = w();
    await flushPromises();
    expect((c.vm as any).departments).toHaveLength(3);
  });

  it('builds department tree correctly', async () => {
    mockGet.mockResolvedValue({ list: mockDepartments });
    const c = w();
    await flushPromises();
    // Root departments should be d-1 and d-2
    const tree = (c.vm as any).departmentTree;
    expect(tree).toHaveLength(2);
    // d-3 should be a child of d-1
    const root1 = tree.find((d: any) => d.id === 'd-1');
    expect(root1.children).toHaveLength(1);
    expect(root1.children[0].id).toBe('d-3');
  });

  it('loads department permissions when node clicked', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/departments') return Promise.resolve({ list: mockDepartments });
      return Promise.resolve(mockDeptPermissions);
    });
    const c = w();
    await flushPromises();
    mockGet.mockClear();
    mockGet.mockResolvedValue(mockDeptPermissions);

    await (c.vm as any).handleNodeClick(mockDepartments[0]);
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith('/department-permissions/d-1');
  });

  it('applies loaded permissions to resource permissions', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/departments') return Promise.resolve({ list: mockDepartments });
      return Promise.resolve(mockDeptPermissions);
    });
    const c = w();
    await flushPromises();
    mockGet.mockClear();
    mockGet.mockResolvedValue(mockDeptPermissions);

    await (c.vm as any).handleNodeClick(mockDepartments[0]);
    await flushPromises();

    const docPerm = (c.vm as any).resourcePermissions.find((r: any) => r.resource === 'document');
    expect(docPerm.read).toBe(true);
    expect(docPerm.create).toBe(true);
    expect(docPerm.delete).toBe(false);
  });

  it('saves department permissions', async () => {
    mockGet.mockResolvedValue({ list: mockDepartments });
    mockPut.mockResolvedValue({});
    const c = w();
    await flushPromises();

    (c.vm as any).selectedDept = mockDepartments[0];
    await (c.vm as any).handleSave();
    await flushPromises();

    expect(mockPut).toHaveBeenCalledWith(
      '/department-permissions/d-1',
      expect.objectContaining({
        isolationLevel: expect.any(String),
        allowedDeptIds: expect.any(Array),
        resources: expect.any(Array),
      }),
    );
  });

  it('shows success message on save', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockResolvedValue({ list: mockDepartments });
    mockPut.mockResolvedValue({});
    const c = w();
    await flushPromises();

    (c.vm as any).selectedDept = mockDepartments[0];
    await (c.vm as any).handleSave();
    await flushPromises();

    expect(ElMessage.success).toHaveBeenCalledWith('部门权限配置保存成功');
  });

  it('shows error message when fetch departments fails', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue(new Error('Network error'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalledWith('获取部门列表失败');
  });

  it('shows error message when save fails', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockResolvedValue({ list: mockDepartments });
    mockPut.mockRejectedValue(new Error('Save error'));
    const c = w();
    await flushPromises();

    (c.vm as any).selectedDept = mockDepartments[0];
    await (c.vm as any).handleSave();
    await flushPromises();

    expect(ElMessage.error).toHaveBeenCalledWith('保存失败');
  });

  it('resets to empty config when department permissions not found', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/departments') return Promise.resolve({ list: mockDepartments });
      return Promise.reject(new Error('Not found'));
    });
    const c = w();
    await flushPromises();
    mockGet.mockClear();
    mockGet.mockRejectedValue(new Error('Not found'));

    await (c.vm as any).handleNodeClick(mockDepartments[0]);
    await flushPromises();

    expect((c.vm as any).deptConfig.isolationLevel).toBe('none');
    expect((c.vm as any).deptConfig.allowedDeptIds).toEqual([]);
  });

  it('otherDepartments excludes selected department', async () => {
    mockGet.mockResolvedValue({ list: mockDepartments });
    const c = w();
    await flushPromises();

    (c.vm as any).selectedDept = mockDepartments[0];
    const others = (c.vm as any).otherDepartments;
    expect(others.every((d: any) => d.id !== 'd-1')).toBe(true);
  });
});
