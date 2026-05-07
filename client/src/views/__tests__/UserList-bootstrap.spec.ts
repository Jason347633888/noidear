import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockRouteQuery = vi.fn(() => ({}));

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mockRouteQuery() }),
}));

import UserList from '../UserList.vue';

const roles = [
  { id: 'r-admin', code: 'admin', name: '系统管理员' },
  { id: 'r-leader', code: 'leader', name: '部门负责人' },
  { id: 'r-user', code: 'user', name: '普通用户' },
  { id: 'r-custom', code: 'custom_auditor', name: '审核员' },
];

const departments = [
  { id: 'd-1', code: 'QA', name: '品质部', status: 'active', managerId: 'u-1', manager: null },
  { id: 'd-2', code: 'MFG', name: '制造部', status: 'inactive', managerId: null, manager: null },
];

const users = [
  {
    id: 'u-1',
    username: 'leader.zhang',
    name: '张三',
    roleId: 'r-leader',
    roleObj: { id: 'r-leader', code: 'leader', name: '部门负责人' },
    role: 'leader',
    departmentId: null,
    department: null,
    status: 'active',
    createdAt: '2026-05-07T00:00:00Z',
  },
];

function mountView(routeQuery: Record<string, string> = {}) {
  mockRouteQuery.mockReturnValue(routeQuery);
  return mount(UserList, {
    global: {
      stubs: {
        'el-card': { template: '<div><slot /><slot name="header" /></div>' },
        'el-form': { template: '<div><slot /></div>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-input': { template: '<input />' },
        'el-select': { template: '<select><slot /></select>' },
        'el-option': { template: '<option />' },
        'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        'el-table': { template: '<div><slot /></div>' },
        'el-table-column': { template: '<div />' },
        'el-pagination': { template: '<div />' },
        'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-alert': { template: '<div><slot /></div>' },
        'el-icon': { template: '<i><slot /></i>' },
      },
    },
  });
}

describe('UserList bootstrap rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteQuery.mockReturnValue({});
    mockGet.mockImplementation((url: string) => {
      if (url === '/users') return Promise.resolve({ list: users, total: users.length, page: 1, limit: 20 });
      if (url === '/departments') return Promise.resolve({ list: departments, total: departments.length });
      if (url === '/roles') return Promise.resolve({ list: roles, total: roles.length, page: 1, limit: 20 });
      return Promise.resolve({ list: [], total: 0 });
    });
  });

  it('只展示系统角色，不展示自定义角色', async () => {
    const wrapper = mountView();
    await flushPromises();
    expect((wrapper.vm as any).systemRoles.map((item: any) => item.code)).toEqual(['admin', 'leader', 'user']);
  });

  it('未分配部门的 leader 会进入待完善基础数据', async () => {
    const wrapper = mountView();
    await flushPromises();
    expect((wrapper.vm as any).isBootstrapIncomplete(users[0])).toBe(true);
  });

  it('负责人用户不可直接改成非 leader', async () => {
    const wrapper = mountView();
    await flushPromises();
    expect((wrapper.vm as any).canChangeRoleForManager({ id: 'u-1', roleObj: { code: 'leader' } }, 'user')).toBe(false);
  });

  it('系统角色不全时阻塞新增编辑', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/roles') return Promise.resolve({ list: roles.filter((item) => item.code !== 'leader'), total: 3, page: 1, limit: 20 });
      if (url === '/users') return Promise.resolve({ list: users, total: users.length, page: 1, limit: 20 });
      if (url === '/departments') return Promise.resolve({ list: departments, total: departments.length });
      return Promise.resolve({ list: [], total: 0 });
    });
    const wrapper = mountView();
    await flushPromises();
    expect((wrapper.vm as any).missingSystemRoles).toEqual(['leader']);
    expect((wrapper.vm as any).userEditingBlocked).toBe(true);
  });

  it('从 route query 初始化部门筛选条件', async () => {
    const wrapper = mountView({ departmentId: 'd-1', status: 'active' });
    await flushPromises();
    expect((wrapper.vm as any).filterForm.departmentId).toBe('d-1');
    expect((wrapper.vm as any).filterForm.status).toBe('active');
  });

  it('从 route query 初始化后，fetchData 带 departmentId 参数请求', async () => {
    mountView({ departmentId: 'd-1', status: 'active' });
    await flushPromises();
    const usersCall = mockGet.mock.calls.find((call: string[]) => call[0] === '/users');
    expect(usersCall).toBeDefined();
    expect(usersCall[1].params.departmentId).toBe('d-1');
    expect(usersCall[1].params.status).toBe('active');
  });

  it('部门筛选支持 unassigned（未分配部门）选项', async () => {
    const wrapper = mountView({ departmentId: 'unassigned' });
    await flushPromises();
    expect((wrapper.vm as any).filterForm.departmentId).toBe('unassigned');
    const usersCall = mockGet.mock.calls.find((call: string[]) => call[0] === '/users');
    expect(usersCall[1].params.departmentId).toBe('unassigned');
  });
});
