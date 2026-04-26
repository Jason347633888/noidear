import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockWorkbench = vi.fn();

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    getWorkbench: (...args: unknown[]) => mockWorkbench(...args),
  },
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}));

const stubs = {
  'el-card': { template: '<div><slot name="header" /><slot /></div>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
};

import DocumentControlWorkbench from '../DocumentControlWorkbench.vue';

describe('DocumentControlWorkbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkbench.mockResolvedValue({
      counts: { pendingReview: 1, dueForReview: 2 },
      dueForReview: [],
    });
  });

  it('loads workbench queues on mount', async () => {
    const wrapper = mount(DocumentControlWorkbench, { global: { stubs } });
    await flushPromises();
    expect(mockWorkbench).toHaveBeenCalledWith(30);
    expect((wrapper.vm as any).workbench.counts.pendingReview).toBe(1);
  });

  it('renders queue cards with correct titles', async () => {
    const wrapper = mount(DocumentControlWorkbench, { global: { stubs } });
    await flushPromises();
    const titles = ['待审核', '即将复审', '外来文件到期', '作废仍被引用', '入口失效', '表单入口缺失', '元数据缺失'];
    expect((wrapper.vm as any).cards.map((card: any) => card.title)).toEqual(titles);
  });

  it('displays zero counts when workbench data is missing', async () => {
    mockWorkbench.mockResolvedValue(null);
    const wrapper = mount(DocumentControlWorkbench, { global: { stubs } });
    await flushPromises();
    expect((wrapper.vm as any).workbench).toBeNull();
  });
});
