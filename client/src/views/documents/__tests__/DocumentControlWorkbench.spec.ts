import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockWorkbench = vi.fn();
const routerPush = vi.fn();

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    getWorkbench: (...args: unknown[]) => mockWorkbench(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
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
import { useRouter } from 'vue-router';

const mountOptions = { global: { stubs, directives: { loading: {} } } };

describe('DocumentControlWorkbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: routerPush } as any);
    mockWorkbench.mockResolvedValue({
      counts: { pendingReview: 1, dueForReview: 2 },
      dueForReview: [],
    });
  });

  it('loads workbench queues on mount', async () => {
    const wrapper = mount(DocumentControlWorkbench, mountOptions);
    await flushPromises();
    expect(mockWorkbench).toHaveBeenCalledWith(30);
    expect((wrapper.vm as any).workbench.counts.pendingReview).toBe(1);
  });

  it('renders queue cards with correct titles', async () => {
    const wrapper = mount(DocumentControlWorkbench, mountOptions);
    await flushPromises();
    const titles = [
      '待审核',
      '即将复审',
      '外来文件到期',
      '作废仍被引用',
      '入口失效',
      '表单入口缺失',
      '落地未确认',
      '字段覆盖异常',
      '引用表单未落地',
      '元数据缺失',
      '培训需求未处理',
      '影响项未关闭',
    ];
    expect((wrapper.vm as any).cards.map((card: any) => card.title)).toEqual(titles);
  });

  it('displays zero counts when workbench data is missing', async () => {
    mockWorkbench.mockResolvedValue(null);
    const wrapper = mount(DocumentControlWorkbench, mountOptions);
    await flushPromises();
    expect((wrapper.vm as any).workbench).toBeNull();
  });

  it('routes to filtered pages when clicking workbench cards', async () => {
    mockWorkbench.mockResolvedValue({ counts: { missingMetadata: 3 }, missingMetadata: [] });

    const wrapper = mount(DocumentControlWorkbench, mountOptions);
    await flushPromises();
    await wrapper.find('[data-test="workbench-card-missingMetadata"]').trigger('click');

    expect(routerPush).toHaveBeenCalledWith({
      path: '/documents/control/workbench/issues',
      query: { type: 'missingMetadata' },
    });
  });

  it('exposes keyboard semantics for workbench cards', async () => {
    mockWorkbench.mockResolvedValue({ counts: { missingMetadata: 3 }, missingMetadata: [] });

    const wrapper = mount(DocumentControlWorkbench, mountOptions);
    await flushPromises();
    const card = wrapper.find('[data-test="workbench-card-missingMetadata"]');

    expect(card.attributes('role')).toBe('button');
    expect(card.attributes('tabindex')).toBe('0');

    await card.trigger('keydown.enter');
    await card.trigger('keydown.space');

    expect(routerPush).toHaveBeenCalledTimes(2);
    expect(routerPush).toHaveBeenNthCalledWith(1, {
      path: '/documents/control/workbench/issues',
      query: { type: 'missingMetadata' },
    });
    expect(routerPush).toHaveBeenNthCalledWith(2, {
      path: '/documents/control/workbench/issues',
      query: { type: 'missingMetadata' },
    });
  });
});
