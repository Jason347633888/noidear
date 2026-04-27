import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import SystemDocumentCenter from '../SystemDocumentCenter.vue';

const mockPush = vi.fn();
const mockListReferenceHealthIssues = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listReferenceHealthIssues: (...args: unknown[]) => mockListReferenceHealthIssues(...args),
  },
}));

describe('SystemDocumentCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListReferenceHealthIssues.mockResolvedValue({
      totals: { total: 1, healthy: 0, dangling: 1, invalid: 0, conflict: 0, superseded: 0 },
      issues: [
        {
          sourceDocId: 'doc-1',
          sourceNumber: 'SRC-001',
          sourceTitle: '来源文件',
          referenceId: 'ref-1',
          label: '缺失文件',
          status: 'dangling',
          reason: '引用文本未匹配到受控文件。',
        },
      ],
    });
  });

  const mountCenter = () => mount(SystemDocumentCenter, {
    global: {
      stubs: {
        'el-tabs': { template: '<div><slot /></div>' },
        'el-tab-pane': {
          template: '<section :data-name="name" :data-lazy="String(lazy)"><slot /></section>',
          props: {
            label: String,
            name: String,
            lazy: Boolean,
          },
        },
        'el-table': { template: '<div><slot /></div>', props: ['data'] },
        'el-table-column': { template: '<div><slot :row="$attrs.row || {}" /></div>', props: ['prop', 'label', 'width'] },
        'el-tag': { template: '<span><slot /></span>', props: ['type'] },
        'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['type', 'text'], emits: ['click'] },
        SystemFileLibrary: { template: '<div class="library-view" />' },
        Level1List: { template: '<div class="ledger-view" />' },
      },
    },
  });

  it('shows library, ledger, and reference issue views under one center', async () => {
    const wrapper = mountCenter();
    await flushPromises();

    expect(wrapper.find('.library-view').exists()).toBe(true);
    expect(wrapper.find('.ledger-view').exists()).toBe(true);
    expect(wrapper.find('[data-name="ledger"]').attributes('data-lazy')).toBe('true');
    expect(wrapper.find('[data-name="referenceIssues"]').attributes('data-lazy')).toBe('true');
    expect(mockListReferenceHealthIssues).toHaveBeenCalled();
    expect((wrapper.vm as any).referenceIssues).toHaveLength(1);
    expect((wrapper.vm as any).referenceIssues[0].sourceNumber).toBe('SRC-001');
  });

  it('routes reference issue actions to the document detail page', async () => {
    const wrapper = mountCenter();
    await flushPromises();

    (wrapper.vm as any).openSource('doc-1');
    expect(mockPush).toHaveBeenCalledWith('/documents/doc-1');
  });
});
