import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

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
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useRoute: () => ({ params: { id: 'doc-1' } }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
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

const stubs: Record<string, any> = {
  'el-page-header': { template: '<div><slot name="content" /></div>' },
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-descriptions': { template: '<div><slot /></div>', props: ['column', 'border'] },
  'el-descriptions-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type'] },
  'el-alert': { template: '<div />', props: ['title', 'type', 'closable'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' , props: ['type', 'disabled', 'loading'] },
  'el-icon': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue', 'title'] },
  'el-form': { template: '<form><slot /></form>', props: ['model', 'rules'] },
  'el-form-item': { template: '<div><slot /></div>', props: ['label', 'prop'] },
  'el-input': { template: '<input />', props: ['modelValue', 'type', 'rows'] },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />', props: ['prop', 'label', 'width'] },
  'OfficePreview': { template: '<div class="stub-office-preview" />', props: ['filename', 'previewUrl'] },
  'RecommendedDocuments': { template: '<div class="stub-recommended" />', props: ['maxCount'] },
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
};

const w = () => mount(DocumentDetail, { global: { stubs } });

describe('DocumentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
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
  });

  it('getStatusText returns correct text', async () => {
    const c = w();
    await flushPromises();
    expect((c.vm as any).getStatusText('draft')).toBe('草稿');
    expect((c.vm as any).getStatusText('pending')).toBe('待审批');
    expect((c.vm as any).getStatusText('approved')).toBe('已发布');
    expect((c.vm as any).getStatusText('rejected')).toBe('已驳回');
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
});
