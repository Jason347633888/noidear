import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import DepartmentList from '../DepartmentList.vue';

const departments = [
  { id: 'd-1', code: 'QA', name: '品质部', status: 'active', managerId: 'u-1', manager: { id: 'u-1', username: 'leader.zhang', name: '张三', status: 'active', roleObj: { id: 'r-leader', code: 'leader', name: '部门负责人' } } },
  { id: 'd-2', code: 'MFG', name: '制造部', status: 'active', managerId: 'u-2', manager: { id: 'u-2', username: 'leader.li', name: '李四', status: 'inactive', roleObj: { id: 'r-leader', code: 'leader', name: '部门负责人' } } },
  { id: 'd-3', code: 'RD', name: '研发部', status: 'inactive', managerId: null, manager: null },
];

const users = [
  { id: 'u-1', username: 'leader.zhang', name: '张三', status: 'active', roleObj: { id: 'r-leader', code: 'leader', name: '部门负责人' }, departmentId: 'd-1' },
  { id: 'u-9', username: 'leader.wang', name: '王五', status: 'active', roleObj: { id: 'r-leader', code: 'leader', name: '部门负责人' }, departmentId: null },
];

function mountView() {
  return mount(DepartmentList, {
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
        'el-tooltip': { template: '<div><slot /></div>' },
      },
    },
  });
}

describe('DepartmentList bootstrap rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/departments') return Promise.resolve({ list: departments, total: departments.length });
      if (url === '/users') return Promise.resolve({ list: users, total: users.length, page: 1, limit: 100 });
      return Promise.resolve({ list: [], total: 0 });
    });
  });

  it('只对启用部门计算负责人异常', async () => {
    const wrapper = mountView();
    await flushPromises();
    expect((wrapper.vm as any).getManagerIssue(departments[1])).toBe('负责人已停用');
    expect((wrapper.vm as any).getManagerIssue(departments[2])).toBe('');
  });

  it('可把无部门 leader 作为负责人候选', async () => {
    const wrapper = mountView();
    await flushPromises();
    expect((wrapper.vm as any).managerCandidates.some((item: any) => item.id === 'u-9')).toBe(true);
  });

  it('人数点击跳转到用户页并带筛选条件', async () => {
    const wrapper = mountView();
    await flushPromises();
    (wrapper.vm as any).goToDepartmentUsers(departments[0]);
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ path: '/users' }));
  });
});
