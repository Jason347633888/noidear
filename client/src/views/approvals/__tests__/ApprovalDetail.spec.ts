import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { Approval } from '@/api/approval';

const mockGetDetail = vi.fn();
const mockGetChain = vi.fn();
const mockApproveUnified = vi.fn();

vi.mock('@/api/approval', () => ({
  default: {
    getApprovalDetail: (...a: unknown[]) => mockGetDetail(...a),
    getApprovalChain: (...a: unknown[]) => mockGetChain(...a),
    approveUnified: (...a: unknown[]) => mockApproveUnified(...a),
  },
}));

const mockBack = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useRoute: () => ({ params: { id: 'ap-test-1' } }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue'] },
  'el-input': { template: '<input />' },
  'el-descriptions': { template: '<div><slot /></div>' },
  'el-descriptions-item': { template: '<div><slot /></div>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-timeline': { template: '<div><slot /></div>' },
  'el-timeline-item': { template: '<div><slot /></div>' },
  'el-table': { template: '<div><slot /></div>' },
  'el-table-column': { template: '<div />' },
  'el-icon': { template: '<i />' },
  ArrowLeft: { template: '<span />' },
  Check: { template: '<span />' },
  Close: { template: '<span />' },
  Warning: { template: '<span />' },
};

import ApprovalDetail from '../ApprovalDetail.vue';

const pendingApproval: Approval = {
  id: 'ap-test-1', recordId: 'rec-1', approverId: 'a-1', level: 1,
  status: 'pending', approvalType: 'single', createdAt: '2026-01-15T10:00:00Z',
  approver: { id: 'a-1', name: 'Approver' },
  record: {
    id: 'rec-1', dataJson: { f1: 'v1' }, status: 'pending_level1',
    submitter: { id: 'u-1', name: 'Submitter' },
    task: { id: 't-1', template: { id: 'tp-1', title: 'Tpl' } },
  },
};

const docApproval: Approval = {
  id: 'ap-test-2', documentId: 'doc-1', approverId: 'a-1', level: 1,
  status: 'pending', approvalType: 'single', createdAt: '2026-01-16T10:00:00Z',
  approver: { id: 'a-1', name: 'Approver' },
  document: { id: 'doc-1', title: 'Doc', number: 'N-001', creator: { id: 'u-2', name: 'Creator' }, status: 'pending' },
};

const approvedApproval: Approval = {
  id: 'ap-test-3', recordId: 'rec-2', approverId: 'a-1', level: 1,
  status: 'approved', approvalType: 'single', createdAt: '2026-01-14T10:00:00Z',
  approvedAt: '2026-01-14T12:00:00Z', comment: 'ok',
  approver: { id: 'a-1', name: 'Approver' },
  record: { id: 'rec-2', submitter: { id: 'u-1', name: 'S' } },
};

const w = () => mount(ApprovalDetail, { global: { stubs } });

describe('ApprovalDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDetail.mockResolvedValue(pendingApproval);
    mockGetChain.mockResolvedValue([]);
  });

  it('renders page title', async () => { const c = w(); await flushPromises(); expect(c.text()).toContain('审批详情'); });
  it('calls getApprovalDetail on mount', async () => { w(); await flushPromises(); expect(mockGetDetail).toHaveBeenCalledTimes(1); });
  it('stores detail data', async () => { const c = w(); await flushPromises(); expect((c.vm as any).approval).toBeTruthy(); });

  it('fetches chain for record approval', async () => {
    mockGetDetail.mockResolvedValue(pendingApproval);
    mockGetChain.mockResolvedValue([pendingApproval]);
    const c = w(); await flushPromises();
    expect(mockGetChain).toHaveBeenCalledTimes(1);
    expect((c.vm as any).chainApprovals).toHaveLength(1);
  });

  it('status label pending', async () => { const c = w(); await flushPromises(); expect((c.vm as any).statusLabel).toBe('待审批'); });
  it('status label approved', async () => { mockGetDetail.mockResolvedValue(approvedApproval); const c = w(); await flushPromises(); expect((c.vm as any).statusLabel).toBe('已通过'); });
  it('approval type label', async () => { const c = w(); await flushPromises(); expect((c.vm as any).approvalTypeLabel).toBe('单人审批'); });

  it('data entries computed from dataJson', async () => {
    const c = w(); await flushPromises();
    const entries = (c.vm as any).dataEntries;
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe('f1');
  });

  it('opens approve dialog', async () => { const c = w(); await flushPromises(); (c.vm as any).handleApprove(); await nextTick(); expect((c.vm as any).showApproveDialog).toBe(true); });

  it('calls approve API', async () => {
    mockApproveUnified.mockResolvedValue({});
    const c = w(); await flushPromises();
    (c.vm as any).approveComment = 'good';
    await (c.vm as any).confirmApprove();
    expect(mockApproveUnified).toHaveBeenCalledTimes(1);
  });

  it('blocks short reject', async () => {
    const { ElMessage } = await import('element-plus');
    const c = w(); await flushPromises();
    (c.vm as any).rejectReason = 'short';
    await (c.vm as any).confirmReject();
    expect(mockApproveUnified).not.toHaveBeenCalled();
    expect(ElMessage.warning).toHaveBeenCalledTimes(1);
  });

  it('calls reject API', async () => {
    mockApproveUnified.mockResolvedValue({});
    const c = w(); await flushPromises();
    (c.vm as any).rejectReason = 'reason that is long enough now';
    await (c.vm as any).confirmReject();
    expect(mockApproveUnified).toHaveBeenCalledTimes(1);
  });

  it('shows error on fetch failure', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetDetail.mockRejectedValue(new Error('e'));
    w(); await flushPromises();
    expect(ElMessage.error).toHaveBeenCalledTimes(1);
  });

  it('format date returns dash for undefined', async () => {
    const c = w(); await flushPromises();
    expect((c.vm as any).formatDate(undefined)).toBe('-');
  });

  it('getStatusType returns correct types', async () => {
    const c = w(); await flushPromises();
    const v = c.vm as any;
    expect(v.getStatusType('pending')).toBe('warning');
    expect(v.getStatusType('approved')).toBe('success');
    expect(v.getStatusType('rejected')).toBe('danger');
  });

  it('handles document approval detail', async () => {
    mockGetDetail.mockResolvedValue(docApproval);
    const c = w(); await flushPromises();
    expect((c.vm as any).approval.document).toBeTruthy();
  });
});
