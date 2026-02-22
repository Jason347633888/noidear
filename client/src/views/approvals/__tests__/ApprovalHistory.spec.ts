import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { Approval } from '@/api/approval';

const mockGetHistory = vi.fn();

vi.mock('@/api/approval', () => ({
  default: {
    getApprovalHistory: (...a: unknown[]) => mockGetHistory(...a),
  },
}));

const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {} }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-empty': { template: '<div class="el-empty" />' },
  'el-pagination': { template: '<div />' },
  'el-icon': { template: '<i />' },
  View: { template: '<span />' },
};

import ApprovalHistory from '../ApprovalHistory.vue';

const histItem: Approval = {
  id: 'h-1', recordId: 'rec-h1', approverId: 'a-1', level: 1,
  status: 'approved', approvalType: 'single', approvedAt: '2026-01-15T12:00:00Z',
  comment: 'ok',
  record: { id: 'rec-h1', submitter: { id: 'u-1', name: 'S' } },
};

const rejItem: Approval = {
  id: 'h-2', recordId: 'rec-h2', approverId: 'a-1', level: 1,
  status: 'rejected', approvalType: 'single', approvedAt: '2026-01-14T12:00:00Z',
  rejectionReason: 'bad',
  record: { id: 'rec-h2', submitter: { id: 'u-2', name: 'T' } },
};

const w = () => mount(ApprovalHistory, { global: { stubs } });

describe('ApprovalHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHistory.mockResolvedValue({ list: [], total: 0 });
  });

  it('renders title', async () => { const c = w(); await flushPromises(); expect(c.text()).toContain('审批历史'); });
  it('calls API on mount', async () => { w(); await flushPromises(); expect(mockGetHistory).toHaveBeenCalledTimes(1); });
  it('shows empty', async () => { const c = w(); await flushPromises(); expect(c.find('.el-empty').exists()).toBe(true); });

  it('stores list data', async () => {
    mockGetHistory.mockResolvedValue({ list: [histItem, rejItem], total: 2 });
    const c = w(); await flushPromises();
    expect((c.vm as any).tableData).toHaveLength(2);
    expect((c.vm as any).total).toBe(2);
  });

  it('navigate to detail', async () => {
    const c = w(); await flushPromises();
    (c.vm as any).handleView(histItem);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('source title for record', async () => {
    mockGetHistory.mockResolvedValue({ list: [histItem], total: 1 });
    const c = w(); await flushPromises();
    expect((c.vm as any).getSourceTitle(histItem)).toBeTruthy();
  });

  it('submitter name', async () => {
    const c = w(); await flushPromises();
    expect((c.vm as any).getSubmitterName(histItem)).toBe('S');
  });

  it('submitter initial', async () => {
    const c = w(); await flushPromises();
    expect((c.vm as any).getSubmitterInitial(histItem)).toBe('S');
  });

  it('approval type label', async () => {
    const c = w(); await flushPromises();
    expect((c.vm as any).getApprovalTypeLabel('single')).toBe('单人');
    expect((c.vm as any).getApprovalTypeLabel('sequential')).toBe('顺签');
  });

  it('format date', async () => {
    const c = w(); await flushPromises();
    const v = c.vm as any;
    expect(v.formatDate(undefined)).toBe('-');
    expect(v.formatDate('2026-01-15T12:00:00Z')).toBeTruthy();
  });

  it('error on fetch', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetHistory.mockRejectedValue(new Error('e'));
    w(); await flushPromises();
    expect(ElMessage.error).toHaveBeenCalledTimes(1);
  });

  it('pagination state', async () => {
    const c = w(); await flushPromises();
    expect((c.vm as any).currentPage).toBe(1);
    expect((c.vm as any).pageSize).toBe(20);
  });
});
