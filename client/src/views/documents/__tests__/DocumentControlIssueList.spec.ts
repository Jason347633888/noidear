import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { computed, inject, provide, type Ref } from 'vue';

const mockListIssues = vi.fn();
const mockPush = vi.fn();
let mockRoute = { query: { type: 'missingMetadata' } as Record<string, string> };

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listWorkbenchIssues: (...args: unknown[]) => mockListIssues(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}));

const stubs = {
  'el-card': { template: '<div><slot name="header" /><slot /></div>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['type', 'size'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type'] },
  'el-empty': { template: '<div class="empty">empty</div>' },
  'el-pagination': { template: '<div class="pagination" />', props: ['currentPage', 'pageSize', 'total'] },
  'el-table': {
    props: ['data'],
    setup(props: { data: unknown[] }) {
      provide('tableRows', computed(() => props.data));
    },
    template: '<div><slot /></div>',
  },
  'el-table-column': {
    props: ['label', 'prop'],
    setup(props: { label: string; prop?: string }, { slots }) {
      const rows = inject<Ref<Record<string, unknown>[]>>('tableRows');
      return { rows, slots, prop: props.prop };
    },
    template: `<div><template v-for="row in rows" :key="row.id"><slot :row="row">{{ prop ? row[prop] : '' }}</slot></template></div>`,
  },
};

import DocumentControlIssueList from '../DocumentControlIssueList.vue';

const mountOptions = { global: { stubs, directives: { loading: {} } } };

describe('DocumentControlIssueList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute = { query: { type: 'missingMetadata' } };
    mockListIssues.mockResolvedValue({
      type: 'missingMetadata',
      items: [
        {
          id: 'issue-1',
          issueType: 'missingMetadata',
          severity: 'medium',
          title: 'QM-001 质量手册',
          description: '文件缺少文控元数据。',
          sourceType: 'document',
          sourceId: 'doc-1',
          sourceLabel: 'QM-001 质量手册',
          sourceRoute: '/documents/doc-1',
          actionLabel: '补齐元数据',
          actionRoute: '/documents/doc-1?section=metadata&issue=missingMetadata',
          detectedAt: '2026-04-28T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('loads issue rows from route query type', async () => {
    const wrapper = mount(DocumentControlIssueList, mountOptions);
    await flushPromises();

    expect(mockListIssues).toHaveBeenCalledWith({ type: 'missingMetadata', page: 1, limit: 20, days: 30 });
    expect(wrapper.text()).toContain('QM-001 质量手册');
  });

  it('routes action button to the issue action route', async () => {
    const wrapper = mount(DocumentControlIssueList, mountOptions);
    await flushPromises();

    await wrapper.find('[data-test="issue-action-issue-1"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith('/documents/doc-1?section=metadata&issue=missingMetadata');
  });

  it('shows empty state when there are no rows', async () => {
    mockListIssues.mockResolvedValue({ type: 'missingMetadata', items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const wrapper = mount(DocumentControlIssueList, mountOptions);
    await flushPromises();

    expect(wrapper.find('.empty').exists()).toBe(true);
  });

  it('falls back to missingMetadata when route type is absent', async () => {
    mockRoute = { query: {} };
    mount(DocumentControlIssueList, mountOptions);
    await flushPromises();

    expect(mockListIssues).toHaveBeenCalledWith({ type: 'missingMetadata', page: 1, limit: 20, days: 30 });
  });
});
