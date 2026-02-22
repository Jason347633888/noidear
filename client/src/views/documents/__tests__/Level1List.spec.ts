import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/documents/level1' }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<div><slot /></div>', props: ['model'] },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-select': { template: '<select />', props: ['modelValue'] },
  'el-option': { template: '<option />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-pagination': { template: '<div />' },
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-tag': { template: '<span><slot /></span>' },
};

import Level1List from '../Level1List.vue';

const mockDoc = { id: 'doc-1', number: 'DOC-001', title: '测试文档', fileName: 'test.pdf', fileSize: 1024, status: 'draft', creator: { name: '管理员' }, createdAt: '2026-01-15T10:00:00Z' };

const w = () => mount(Level1List, { global: { stubs } });

describe('Level1List', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGet.mockResolvedValue({ list: [], total: 0 }); });

  it('renders without error', async () => { const c = w(); await flushPromises(); expect(c.exists()).toBe(true); });
  it('calls API on mount', async () => { w(); await flushPromises(); expect(mockGet).toHaveBeenCalledWith('/documents', expect.any(Object)); });
  it('stores document data', async () => { mockGet.mockResolvedValue({ list: [mockDoc], total: 1 }); const c = w(); await flushPromises(); expect((c.vm as any).tableData).toHaveLength(1); });
  it('handles API error', async () => { const { ElMessage } = await import('element-plus'); mockGet.mockRejectedValue(new Error('err')); w(); await flushPromises(); expect(ElMessage.error).toHaveBeenCalled(); });
  it('resets filter on handleReset', async () => { const c = w(); await flushPromises(); const v = c.vm as any; v.filterForm.keyword = 'x'; v.filterForm.status = 'draft'; v.handleReset(); expect(v.filterForm.keyword).toBe(''); expect(v.filterForm.status).toBe(''); });
  it('formatSize converts bytes', async () => { const c = w(); await flushPromises(); const v = c.vm as any; expect(v.formatSize(0)).toBe('0 B'); expect(v.formatSize(1024)).toMatch(/K/); });
  it('getStatusText returns labels', async () => { const c = w(); await flushPromises(); const v = c.vm as any; expect(v.getStatusText('draft')).toBe('草稿'); expect(v.getStatusText('approved')).toBe('已发布'); expect(v.getStatusText('pending')).toBe('待审批'); expect(v.getStatusText('rejected')).toBe('已驳回'); });
  it('getStatusType returns tag type', async () => { const c = w(); await flushPromises(); const v = c.vm as any; expect(v.getStatusType('draft')).toBe('info'); expect(v.getStatusType('approved')).toBe('success'); });
  it('pagination total is set', async () => { mockGet.mockResolvedValue({ list: [mockDoc], total: 5 }); const c = w(); await flushPromises(); expect((c.vm as any).pagination.total).toBe(5); });
});
