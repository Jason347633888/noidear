import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { Approval } from '@/api/approval';

const mockGetPending = vi.fn();
const mockApproveUnified = vi.fn();

vi.mock('@/api/approval', () => ({
  default: {
    getPendingApprovals: (...a: unknown[]) => mockGetPending(...a),
    approveUnified: (...a: unknown[]) => mockApproveUnified(...a),
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
  'el-badge': { template: '<span />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue'] },
  'el-input': { template: '<input />' },
  'el-empty': { template: '<div class="el-empty" />' },
  'el-icon': { template: '<i />' },
  Document: { template: '<span />' },
  View: { template: '<span />' },
  Check: { template: '<span />' },
  Close: { template: '<span />' },
  Warning: { template: '<span />' },
};

import ApprovalPending from '../ApprovalPending.vue';

const taskItem: Approval = {
  id: 'ap-1', recordId: 'rec-1', approverId: 'a-1', level: 1,
  status: 'pending', approvalType: 'single', createdAt: '2026-01-15T10:00:00Z',
  record: { id: 'rec-1', submitter: { id: 'u-1', name: 'A' }, task: { id: 't-1', template: { id: 'tp-1', title: 'T' } } },
};

const docItem: Approval = {
  id: 'ap-2', documentId: 'doc-1', approverId: 'a-1', level: 1,
  status: 'pending', approvalType: 'single', createdAt: '2026-01-16T10:00:00Z',
  document: { id: 'doc-1', title: 'D', number: 'N-001', level: 1, creator: { id: 'u-2', name: 'B' } },
};

const w = () => mount(ApprovalPending, { global: { stubs } });

describe('ApprovalPending', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetPending.mockResolvedValue([]); });

  it('renders title', async () => { const c = w(); await flushPromises(); expect(c.text()).toContain('待我审批'); });
  it('shows empty', async () => { const c = w(); await flushPromises(); expect(c.find('.el-empty').exists()).toBe(true); });
  it('calls API on mount', async () => { w(); await flushPromises(); expect(mockGetPending).toHaveBeenCalledTimes(1); });
  it('stores data', async () => { mockGetPending.mockResolvedValue([taskItem, docItem]); const c = w(); await flushPromises(); expect((c.vm as any).tableData).toHaveLength(2); });
  it('source title task', async () => { const c = w(); await flushPromises(); expect((c.vm as any).getSourceTitle(taskItem)).toBe('T'); });
  it('source title doc', async () => { const c = w(); await flushPromises(); expect((c.vm as any).getSourceTitle(docItem)).toContain('N-001'); });
  it('submitter task', async () => { const c = w(); await flushPromises(); expect((c.vm as any).getSubmitterName(taskItem)).toBe('A'); });
  it('submitter doc', async () => { const c = w(); await flushPromises(); expect((c.vm as any).getSubmitterName(docItem)).toBe('B'); });
  it('type labels', async () => { const c = w(); await flushPromises(); const v = c.vm as any; expect(v.getApprovalTypeLabel('single')).toBe('单人'); expect(v.getApprovalTypeLabel('countersign')).toBe('会签'); });
  it('navigate view', async () => { const c = w(); await flushPromises(); (c.vm as any).handleView(taskItem); expect(mockPush).toHaveBeenCalledTimes(1); });
  it('open approve dialog', async () => { const c = w(); await flushPromises(); (c.vm as any).handleApprove(taskItem); await nextTick(); expect((c.vm as any).showApproveDialog).toBe(true); });
  it('confirm approve', async () => { mockApproveUnified.mockResolvedValue({}); mockGetPending.mockResolvedValue([taskItem]); const c = w(); await flushPromises(); const v = c.vm as any; v.handleApprove(taskItem); v.approveComment = 'ok'; await v.confirmApprove(); expect(mockApproveUnified).toHaveBeenCalledTimes(1); });
  it('open reject dialog', async () => { const c = w(); await flushPromises(); (c.vm as any).handleReject(docItem); await nextTick(); expect((c.vm as any).showRejectDialog).toBe(true); });
  it('block short reason', async () => { const { ElMessage } = await import('element-plus'); const c = w(); await flushPromises(); const v = c.vm as any; v.handleReject(taskItem); v.rejectReason = 'x'; await v.confirmReject(); expect(mockApproveUnified).not.toHaveBeenCalled(); expect(ElMessage.warning).toHaveBeenCalledTimes(1); });
  it('confirm reject', async () => { mockApproveUnified.mockResolvedValue({}); mockGetPending.mockResolvedValue([taskItem]); const c = w(); await flushPromises(); const v = c.vm as any; v.handleReject(taskItem); v.rejectReason = 'reason longer than ten characters'; await v.confirmReject(); expect(mockApproveUnified).toHaveBeenCalledTimes(1); });
  it('error on fetch', async () => { const { ElMessage } = await import('element-plus'); mockGetPending.mockRejectedValue(new Error('e')); w(); await flushPromises(); expect(ElMessage.error).toHaveBeenCalledTimes(1); });
  it('null response', async () => { mockGetPending.mockResolvedValue(null); const c = w(); await flushPromises(); expect((c.vm as any).tableData).toEqual([]); });
  it('format date', async () => { const c = w(); await flushPromises(); const v = c.vm as any; expect(v.formatDate(undefined)).toBe('-'); expect(v.formatDate('2026-01-15T10:00:00Z')).toBeTruthy(); });
  it('submitter initial', async () => { const c = w(); await flushPromises(); expect((c.vm as any).getSubmitterInitial(taskItem)).toBe('A'); });
});
