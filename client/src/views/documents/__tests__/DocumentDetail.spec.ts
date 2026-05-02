import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, provide, inject, nextTick, type PropType } from 'vue';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
const mockPush = vi.fn();
const mockUpdateMarkdown = vi.fn();
const mockGetReferenceHealth = vi.fn();
const mockCreateRevision = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useRoute: () => ({ params: { id: 'doc-1' } }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn(), prompt: vi.fn() },
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    user: { id: 'user-1', name: 'Admin', role: 'admin' },
    isAdmin: true,
  }),
}));

vi.mock('@/api/file-preview', () => ({
  default: {
    getPreviewInfo: vi.fn().mockResolvedValue({ type: 'pdf', url: 'http://example.com/file.pdf', fileName: 'test.pdf' }),
    getDownloadUrl: vi.fn((id: string) => `/api/v1/documents/${id}/download`),
  },
}));

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    updateMarkdown: (...args: unknown[]) => mockUpdateMarkdown(...args),
    getReferenceHealth: (...args: unknown[]) => mockGetReferenceHealth(...args),
    createRevision: (...args: unknown[]) => mockCreateRevision(...args),
  },
}));

const stubs: Record<string, any> = {
  'el-page-header': { template: '<div><slot name="content" /></div>' },
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-descriptions': { template: '<div><slot /></div>', props: ['column', 'border'] },
  'el-descriptions-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type'] },
  'el-alert': { template: '<div />', props: ['title', 'type', 'closable'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' , props: ['type', 'disabled', 'loading'], emits: ['click'] },
  'el-icon': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue', 'title'] },
  'el-form': { template: '<form><slot /></form>', props: ['model', 'rules'] },
  'el-form-item': { template: '<div><slot /></div>', props: ['label', 'prop'] },
  'el-input': { template: '<input />', props: ['modelValue', 'type', 'rows'] },
  'el-table': defineComponent({
    props: { data: { type: Array as PropType<unknown[]>, default: () => [] } },
    setup(props, { slots }) {
      provide('tableRows', props.data);
      return () => h('div', slots.default?.());
    },
  }),
  'el-table-column': defineComponent({
    props: ['prop', 'label', 'width', 'minWidth', 'fixed'],
    setup(props, { slots }) {
      const rows = inject<unknown[]>('tableRows', []);
      return () => h('div', [
        h('span', props.label),
        ...rows.map((row) => h('div', slots.default?.({ row }))),
      ]);
    },
  }),
  'OfficePreview': { template: '<div class="stub-office-preview" />', props: ['filename', 'previewUrl'] },
  'MarkdownEditor': {
    template: '<textarea class="markdown-editor-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
  },
  'View': { template: '<span />' },
  'Download': { template: '<span />' },
  'Edit': { template: '<span />' },
  'Delete': { template: '<span />' },
};

import DocumentDetail from '../DocumentDetail.vue';

const mockDocument = {
  id: 'doc-1', number: 'DOC-001', title: '测试文档',
  fileName: 'test.pdf', fileSize: BigInt(1024),
  status: 'draft', version: 1, level: 1,
  creatorId: 'user-1', creator: { name: '管理员' },
  approver: null, approvedAt: null,
  createdAt: '2026-01-15T10:00:00Z',
  content_md: '# 文档正文\n\n这是 Markdown 正文',
  document_type: 'PROCEDURE',
  source_folder: '02',
  owner_department: '品质部',
  review_due_date: '2026-05-30T00:00:00Z',
  sourceReferences: [
    { id: 'ref1', relationType: 'REQUIRES_RECORD', targetLabel: '研发流程', targetRoute: '/process' },
  ],
  targetReferences: [],
};

const makeDocument = (overrides: Partial<typeof mockDocument> = {}) => ({
  ...mockDocument,
  ...overrides,
});

const w = () => mount(DocumentDetail, { global: { stubs } });

describe('DocumentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockUpdateMarkdown.mockResolvedValue({});
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 1, healthy: 1, dangling: 0, invalid: 0, conflict: 0, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref1', label: '研发流程', status: 'healthy', reason: '目标文件可作为当前引用依据。', targetDocId: 'doc-2', targetTitle: '研发流程' },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(mockDocument);
    });
  });

  it('renders without error', async () => {
    const c = w();
    await flushPromises();
    expect(c.exists()).toBe(true);
  });

  it('calls API to fetch document on mount', async () => {
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/documents/doc-1');
  });

  it('stores document data after fetch', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).document).not.toBeNull();
    expect((c.vm as any).document.id).toBe('doc-1');
  });

  it('renders current version from versionLabel', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve(makeDocument({ version: { bad: 'decimal-object' } as any, versionNo: 2, versionLabel: 'V2' } as any));
    });

    const wrapper = w();
    await flushPromises();

    expect(wrapper.text()).toContain('V2');
    expect(wrapper.text()).not.toContain('decimal-object');
  });

  it('falls back to versionNo for current version display', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve(makeDocument({ version: { bad: 'decimal-object' } as any, versionNo: 3 } as any));
    });

    const wrapper = w();
    await flushPromises();

    expect(wrapper.text()).toContain('V3');
    expect(wrapper.text()).not.toContain('decimal-object');
  });

  it('handles API error on mount', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue(new Error('Network error'));
    w();
    await flushPromises();
    expect(ElMessage.error).toHaveBeenCalled();
  });

  it('formatSize handles 0 bytes', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).formatSize(0)).toBe('0 B');
  });

  it('formatSize handles kilobytes', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).formatSize(1024)).toMatch(/K/);
  });

  it('formatSize handles megabytes', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).formatSize(1024 * 1024)).toMatch(/M/);
  });

  it('getStatusType returns correct type for draft', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).getStatusType('draft')).toBe('info');
  });

  it('getStatusType returns correct type for approved', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).getStatusType('approved')).toBe('success');
    expect((c.vm as any).getStatusType('effective')).toBe('success');
  });

  it('getStatusText returns correct text', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).getStatusText('draft')).toBe('草稿');
    expect((c.vm as any).getStatusText('pending')).toBe('待审批');
    expect((c.vm as any).getStatusText('approved')).toBe('已发布');
    expect((c.vm as any).getStatusText('effective')).toBe('已发布');
    expect((c.vm as any).getStatusText('rejected')).toBe('已驳回');
  });

  it('shows lifecycle actions for effective documents', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve(makeDocument({ status: 'effective' }));
    });

    const wrapper = w();
    await flushPromises();

    expect(wrapper.text()).toContain('停用文档');
    expect(wrapper.text()).toContain('归档');
    expect(wrapper.text()).toContain('作废');
  });

  it('isCreator is true when user is document creator', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).isCreator).toBe(true);
  });

  it('isAdmin is true for admin user', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).isAdmin).toBe(true);
  });

  it('handles submit and confirms', async () => {
    const { ElMessage, ElMessageBox } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockPost.mockResolvedValue({});
    const c = w();
    await flushPromises();
    await (c.vm as any).handleSubmit();
    await flushPromises();
    expect(mockPost).toHaveBeenCalledWith('/documents/doc-1/submit');
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('cancels submit when user cancels confirm', async () => {
    const { ElMessageBox } = await import('element-plus');
    (ElMessageBox.confirm as any).mockRejectedValue('cancel');
    const c = w();
    await flushPromises();
    await (c.vm as any).handleSubmit();
    await flushPromises();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('handles delete with confirm', async () => {
    const { ElMessageBox, ElMessage } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockDelete.mockResolvedValue({});
    const c = w();
    await flushPromises();
    await (c.vm as any).handleDelete();
    await flushPromises();
    expect(mockDelete).toHaveBeenCalledWith('/documents/doc-1');
    expect(ElMessage.success).toHaveBeenCalled();
  });

  it('cancels delete when user cancels', async () => {
    const { ElMessageBox } = await import('element-plus');
    (ElMessageBox.confirm as any).mockRejectedValue('cancel');
    const c = w();
    await flushPromises();
    await (c.vm as any).handleDelete();
    await flushPromises();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('renders document control metadata and references', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).document.document_type).toBe('PROCEDURE');
    expect((c.vm as any).document.sourceReferences).toHaveLength(1);
  });

  it('shows version action buttons for historical versions', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.endsWith('/versions')) {
        return Promise.resolve({
          versions: [
            {
              id: 'v1',
              version: 1.0,
              fileName: 'old.pdf',
              fileSize: '100',
              createdAt: '2026-01-01',
              creator: { name: 'Admin' },
            },
          ],
        });
      }
      return Promise.resolve(makeDocument({ status: 'effective', version: 1.1 }));
    });

    const wrapper = w();
    await flushPromises();

    expect(wrapper.text()).toContain('下载版本');
    expect(wrapper.text()).toContain('预览版本');
    expect(wrapper.text()).toContain('回滚');
  });

  it('falls back to version download URL when version preview request fails', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.endsWith('/versions/1/preview')) {
        return Promise.reject(new Error('Preview failed'));
      }
      if (url.endsWith('/versions')) {
        return Promise.resolve({
          versions: [
            {
              id: 'v1',
              version: 1,
              fileName: 'old.pdf',
              fileSize: '100',
              createdAt: '2026-01-01',
              creator: { name: 'Admin' },
            },
          ],
        });
      }
      return Promise.resolve(makeDocument({ status: 'effective', version: 1.1 }));
    });

    const wrapper = w();
    await flushPromises();

    await expect((wrapper.vm as any).handlePreviewVersion({ version: 1 })).resolves.toBeUndefined();

    expect((wrapper.vm as any).showPreview).toBe(true);
    expect((wrapper.vm as any).previewUrl).toBe('/api/v1/documents/doc-1/versions/1/download');
    expect((wrapper.vm as any).previewLoading).toBe(false);
  });

  it('classifies wikilink references for detail sections', async () => {
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 3, healthy: 1, dangling: 1, invalid: 0, conflict: 1, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'resolved', label: '程序文件', status: 'healthy', reason: '目标文件可作为当前引用依据。', targetDocId: 'doc-2', targetTitle: '程序文件' },
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'unresolved', label: '不存在文件', status: 'dangling', reason: '引用文本未匹配到受控文件。' },
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'conflict', label: '重复文件', status: 'conflict', reason: '引用文本匹配到多个候选文件，需要文控人员确认目标。', candidates: [{ id: 'doc-3', title: '重复文件' }] },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve({
        ...mockDocument,
        sourceReferences: [
          { id: 'resolved', relationType: 'WIKILINK', targetType: 'document', targetLabel: '程序文件', targetDoc: { id: 'doc-2', title: '程序文件', status: 'draft' } },
          { id: 'unresolved', relationType: 'WIKILINK', targetType: 'unresolved_document', targetLabel: '不存在文件' },
          { id: 'conflict', relationType: 'WIKILINK', targetType: 'conflict_document', targetLabel: '重复文件', snapshot: { candidates: [{ id: 'doc-3', title: '重复文件' }] } },
        ],
        targetReferences: [
          { id: 'incoming', relationType: 'WIKILINK', sourceDoc: { id: 'doc-4', title: '上游文件', status: 'draft' } },
        ],
      });
    });

    const c = w();
    await flushPromises();

    expect((c.vm as any).outboundReferences.map((ref: any) => ref.id)).toEqual(['resolved']);
    expect((c.vm as any).unresolvedWikilinks.map((ref: any) => ref.id)).toEqual(['unresolved']);
    expect((c.vm as any).conflictWikilinks.map((ref: any) => ref.id)).toEqual(['conflict']);
    expect((c.vm as any).inboundReferences.map((ref: any) => ref.id)).toEqual(['incoming']);
    expect(c.text()).toContain('引用了');
    expect(c.text()).toContain('被引用');
    expect(c.text()).toContain('未解析引用');
    expect(c.text()).toContain('冲突引用');
    expect(c.text()).toContain('引用健康概览');
    expect((c.vm as any).referenceHealthIssues.map((issue: any) => issue.status)).toEqual(['dangling', 'conflict']);
  });

  it('renders markdown body when document has content_md', async () => {
    const c = w();
    await flushPromises();
    expect(c.find('.markdown-viewer h1').text()).toBe('文档正文');
    expect(c.find('.markdown-viewer').text()).toContain('这是 Markdown 正文');
  });

  it('routes resolved markdown wikilinks to the target document', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[GRSS-CX-01|文件控制程序]]',
        sourceReferences: [
          {
            id: 'ref-resolved',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'document',
            targetDocId: 'doc-2',
            targetId: 'doc-2',
            targetLabel: '文件控制程序',
            wikilinkTarget: 'GRSS-CX-01',
            sectionId: 'wikilink:GRSS-CX-01',
            targetDoc: { id: 'doc-2', title: '文件控制程序', number: 'GRSS-CX-01', doc_code: null, status: 'effective' },
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).toHaveBeenCalledWith('/documents/doc-2');
  });

  it('uses legacy sectionId to route old resolved wikilinks', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[旧文件]]',
        sourceReferences: [
          {
            id: 'ref-legacy',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'document',
            targetDocId: 'doc-legacy',
            targetId: 'doc-legacy',
            targetLabel: '旧文件',
            sectionId: 'wikilink:旧文件',
            targetDoc: { id: 'doc-legacy', title: '旧文件', status: 'effective' },
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).toHaveBeenCalledWith('/documents/doc-legacy');
  });

  it('warns and locates dangling markdown wikilinks without navigating', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 1, healthy: 0, dangling: 1, invalid: 0, conflict: 0, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-dangling', label: '缺失文件', status: 'dangling', reason: '引用文本未匹配到受控文件。' },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[缺失文件]]',
        sourceReferences: [
          {
            id: 'ref-dangling',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'unresolved_document',
            targetLabel: '缺失文件',
            wikilinkTarget: '缺失文件',
            sectionId: 'wikilink:缺失文件',
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).not.toHaveBeenCalled();
    expect((wrapper.vm as any).activeReferenceLabel).toBe('缺失文件');
    expect(ElMessage.warning).toHaveBeenCalledWith('引用未解析，请在引用关系中处理。');
  });

  it('warns and expands conflict markdown wikilinks without navigating', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 1, healthy: 0, dangling: 0, invalid: 0, conflict: 1, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-conflict', label: '重复文件', status: 'conflict', reason: '引用文本匹配到多个候选文件。', candidates: [{ id: 'doc-a', title: '重复文件' }] },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[重复文件]]',
        sourceReferences: [
          {
            id: 'ref-conflict',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'conflict_document',
            targetLabel: '重复文件',
            wikilinkTarget: '重复文件',
            sectionId: 'wikilink:重复文件',
            snapshot: { candidates: [{ id: 'doc-a', title: '重复文件' }] },
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).not.toHaveBeenCalled();
    expect((wrapper.vm as any).expandedConflictReferenceId).toBe('ref-conflict');
    expect(ElMessage.warning).toHaveBeenCalledWith('引用存在多个候选，请选择正确目标。');
  });

  it('shows alias dangling wikilink as wikilink-dangling and handles click', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 1, healthy: 0, dangling: 1, invalid: 0, conflict: 0, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-alias-dangling', label: '显示名', status: 'dangling', reason: '引用文本未匹配到受控文件。' },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[缺失编号|显示名]]',
        sourceReferences: [
          {
            id: 'ref-alias-dangling',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'unresolved_document',
            targetLabel: '显示名',
            wikilinkTarget: '缺失编号',
            sectionId: 'wikilink:缺失编号',
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();

    expect(wrapper.find('.wikilink').classes()).toContain('wikilink-dangling');

    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).not.toHaveBeenCalled();
    expect(ElMessage.warning).toHaveBeenCalledWith('引用未解析，请在引用关系中处理。');
  });

  it('shows alias conflict wikilink as wikilink-conflict and handles click', async () => {
    const { ElMessage } = await import('element-plus');
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 1, healthy: 0, dangling: 0, invalid: 0, conflict: 1, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-alias-conflict', label: '显示名', status: 'conflict', reason: '引用文本匹配到多个候选文件。', candidates: [{ id: 'doc-x', title: '冲突文件A' }] },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '见 [[冲突编号|显示名]]',
        sourceReferences: [
          {
            id: 'ref-alias-conflict',
            sourceDocId: 'doc-1',
            relationType: 'WIKILINK',
            targetType: 'conflict_document',
            targetLabel: '显示名',
            wikilinkTarget: '冲突编号',
            sectionId: 'wikilink:冲突编号',
          },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();

    expect(wrapper.find('.wikilink').classes()).toContain('wikilink-conflict');

    await wrapper.find('.wikilink').trigger('click');

    expect(mockPush).not.toHaveBeenCalled();
    expect((wrapper.vm as any).expandedConflictReferenceId).toBe('ref-alias-conflict');
    expect(ElMessage.warning).toHaveBeenCalledWith('引用存在多个候选，请选择正确目标。');
  });

  it('passes resolved dangling and conflict wikilink status to MarkdownViewer', async () => {
    mockGetReferenceHealth.mockResolvedValue({
      totals: { total: 3, healthy: 1, dangling: 1, invalid: 0, conflict: 1, superseded: 0 },
      issues: [
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-dangling', label: '缺失文件', status: 'dangling', reason: '引用文本未匹配到受控文件。' },
        { sourceDocId: 'doc-1', sourceTitle: '测试文档', referenceId: 'ref-conflict', label: '重复文件', status: 'conflict', reason: '引用文本匹配到多个候选文件。' },
      ],
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve(makeDocument({
        content_md: '[[正常文件]] [[缺失文件]] [[重复文件]]',
        sourceReferences: [
          { id: 'ref-ok', sourceDocId: 'doc-1', relationType: 'WIKILINK', targetType: 'document', targetDocId: 'doc-ok', targetLabel: '正常文件', wikilinkTarget: '正常文件', targetDoc: { id: 'doc-ok', title: '正常文件', status: 'effective' } },
          { id: 'ref-dangling', sourceDocId: 'doc-1', relationType: 'WIKILINK', targetType: 'unresolved_document', targetLabel: '缺失文件', wikilinkTarget: '缺失文件' },
          { id: 'ref-conflict', sourceDocId: 'doc-1', relationType: 'WIKILINK', targetType: 'conflict_document', targetLabel: '重复文件', wikilinkTarget: '重复文件' },
        ],
      }));
    });

    const wrapper = w();
    await flushPromises();
    const links = wrapper.findAll('.wikilink');

    expect(links[0].classes()).toContain('wikilink-resolved');
    expect(links[1].classes()).toContain('wikilink-dangling');
    expect(links[2].classes()).toContain('wikilink-conflict');
  });

  it('saves markdown edits for draft documents and refreshes detail', async () => {
    const c = w();
    await flushPromises();

    await c.findAll('button').find(button => button.text() === '编辑正文')!.trigger('click');
    await c.find('.markdown-editor-stub').setValue('更新后的正文');
    await c.findAll('button').find(button => button.text() === '保存正文')!.trigger('click');
    await flushPromises();

    expect(mockUpdateMarkdown).toHaveBeenCalledWith('doc-1', { contentMd: '更新后的正文' });
    expect(mockGet.mock.calls.filter(([url]) => url === '/documents/doc-1')).toHaveLength(2);
    expect(mockGetReferenceHealth).toHaveBeenCalledWith('doc-1');
  });

  it('routes reference health actions to replacement or target documents', async () => {
    const { ElMessage } = await import('element-plus');
    const c = w();
    await flushPromises();

    (c.vm as any).handleReferenceHealthIssue({
      status: 'dangling',
      referenceId: 'dangling',
      label: '缺失文件',
    });
    expect((c.vm as any).activeReferenceLabel).toBe('缺失文件');
    expect((c.vm as any).markdownEditing).toBe(true);
    expect(ElMessage.warning).toHaveBeenCalledWith('已定位到正文引用: [[缺失文件]]');

    (c.vm as any).handleReferenceHealthIssue({
      status: 'conflict',
      referenceId: 'conflict',
      label: '重复文件',
    });
    expect((c.vm as any).expandedConflictReferenceId).toBe('conflict');
    expect(ElMessage.warning).toHaveBeenCalledWith('已展开候选文件，请选择正确目标后更新引用');

    (c.vm as any).handleReferenceHealthIssue({
      status: 'superseded',
      label: '旧版文件',
      supersededById: 'doc-new',
    });
    expect(mockPush).toHaveBeenCalledWith('/documents/doc-new');

    (c.vm as any).handleReferenceHealthIssue({
      status: 'invalid',
      label: '失效文件',
      targetDocId: 'doc-old',
    });
    expect(mockPush).toHaveBeenCalledWith('/documents/doc-old');
  });

  it('shows resolved owner department before legacy owner_department', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve({
        id: 'doc1',
        title: '质量手册',
        number: 'QM-001',
        level: 1,
        status: 'effective',
        version: 1,
        fileName: 'qm.pdf',
        fileSize: 100,
        creatorId: 'u1',
        creator: { name: 'Admin' },
        approver: null,
        approvedAt: null,
        createdAt: '2026-04-27T00:00:00.000Z',
        owner_department: '旧品质部',
        ownerDepartment: { id: 'dep1', name: '品质部' },
      });
    });

    const wrapper = mount(DocumentDetail, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('品质部');
    expect(wrapper.text()).not.toContain('旧品质部');
  });

  it('does not expose or keep markdown editor visible for non-editable statuses', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve([]);
      return Promise.resolve({ ...mockDocument, status: 'approved' });
    });
    const c = w();
    await flushPromises();

    expect(c.findAll('button').some(button => button.text() === '编辑正文')).toBe(false);

    (c.vm as any).markdownEditing = true;
    await nextTick();

    expect(c.find('.markdown-editor-stub').exists()).toBe(false);
  });

  it('navigates to evidence chain explorer when 查看证据链 button is clicked', async () => {
    const c = w();
    await flushPromises();

    const evidenceChainButton = c.findAll('button').find(button => button.text() === '查看证据链');
    expect(evidenceChainButton).toBeDefined();

    await evidenceChainButton!.trigger('click');

    expect(mockPush).toHaveBeenCalledWith({
      path: '/documents/operations/audit-chain',
      query: {
        sourceType: 'document',
        sourceId: 'doc-1',
      },
    });
  });

  it('canEditDraft is true for draft and rejected status', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).canEditDraft).toBe(true);
  });

  it('canCreateRevision is false for draft status', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).canCreateRevision).toBe(false);
  });

  it('canCreateRevision is true for effective status', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve(makeDocument({ status: 'effective' }));
    });
    const c = w();
    await flushPromises();
    expect((c.vm as any).canCreateRevision).toBe(true);
    expect((c.vm as any).canEditDraft).toBe(false);
  });

  it('shows 发起修订 button for effective documents', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve(makeDocument({ status: 'effective' }));
    });
    const c = w();
    await flushPromises();
    expect(c.findAll('button').some(btn => btn.text() === '发起修订')).toBe(true);
    expect(c.findAll('button').some(btn => btn.text() === '编辑草稿')).toBe(false);
  });

  it('shows 编辑草稿 button for draft documents', async () => {
    const c = w();
    await flushPromises();
    expect(c.findAll('button').some(btn => btn.text() === '编辑草稿')).toBe(true);
    expect(c.findAll('button').some(btn => btn.text() === '发起修订')).toBe(false);
  });

  it('calls createRevision API and navigates to new draft on 发起修订 click', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/versions')) return Promise.resolve({ versions: [] });
      return Promise.resolve(makeDocument({ status: 'effective' }));
    });
    mockCreateRevision.mockResolvedValue({ id: 'doc-v2', status: 'draft' });

    const c = w();
    await flushPromises();

    const revisionButton = c.findAll('button').find(btn => btn.text() === '发起修订');
    await revisionButton!.trigger('click');
    await flushPromises();

    expect(mockCreateRevision).toHaveBeenCalledWith('doc-1');
    expect(mockPush).toHaveBeenCalledWith('/documents/doc-v2');
  });
});
