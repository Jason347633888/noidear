import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();

vi.mock('@/api/request', () => ({
  default: { get: (...args: unknown[]) => mockGet(...args), delete: vi.fn() },
}));

import RoleList from '../RoleList.vue';

const roles = [
  { id: '1', code: 'user', name: '普通用户', description: '', createdAt: '2026-01-01T00:00:00Z' },
  { id: '2', code: 'leader', name: '部门负责人', description: '', createdAt: '2026-01-01T00:00:00Z' },
  { id: '3', code: 'admin', name: '系统管理员', description: '', createdAt: '2026-01-01T00:00:00Z' },
  { id: '4', code: 'auditor', name: '审核员', description: '', createdAt: '2026-01-01T00:00:00Z' },
];

describe('RoleList bootstrap alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ list: roles, total: roles.length, page: 1, limit: 20 });
  });

  it('system roles are sorted first', async () => {
    const wrapper = mount(RoleList, { global: { stubs: { 'el-card': { template: '<div><slot /><slot name="header" /></div>' }, 'el-form': { template: '<div><slot /></div>' }, 'el-form-item': { template: '<div><slot /></div>' }, 'el-input': { template: '<input />' }, 'el-button': { template: '<button><slot /></button>' }, 'el-table': { template: '<div><slot /></div>' }, 'el-table-column': { template: '<div />' }, 'el-pagination': { template: '<div />' }, RoleForm: { template: '<div />' }, RolePermissions: { template: '<div />' } } } });
    await flushPromises();
    expect((wrapper.vm as any).sortedRoles.slice(0, 3).map((item: any) => item.code)).toEqual(['admin', 'leader', 'user']);
  });
});
