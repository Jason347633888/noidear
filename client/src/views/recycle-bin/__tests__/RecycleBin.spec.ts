import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/api/recycle-bin', () => ({
  default: {
    findAll: (...args: unknown[]) => mockGet(...args),
    restore: (...args: unknown[]) => mockPost(...args),
    permanentDelete: (...args: unknown[]) => mockDelete(...args),
    batchRestore: vi.fn(),
    batchPermanentDelete: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/recycle-bin' }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-tabs': { template: '<div><slot /></div>', props: ['modelValue'] },
  'el-tab-pane': { template: '<div><slot /></div>', props: ['label', 'name'] },
  'el-input': { template: '<input v-model="modelValue" />', props: ['modelValue'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['disabled', 'type'] },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />', props: ['label', 'prop', 'width', 'type'] },
  'el-pagination': { template: '<div />', props: ['currentPage', 'pageSize', 'total'] },
};

import RecycleBin from '../../RecycleBin.vue';

const mockDocument = {
  id: 'doc-1',
  title: 'Test Document',
  number: 'DOC-001',
  deletedAt: '2026-01-15T10:00:00Z',
};

const mockTemplate = {
  id: 'tpl-1',
  title: 'Test Template',
  number: 'TPL-001',
  deletedAt: '2026-01-15T10:00:00Z',
};

const w = () => mount(RecycleBin, { global: { stubs } });

describe('RecycleBin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ list: [], total: 0 });
  });

  it('should render title', async () => {
    const wrapper = w();
    await flushPromises();
    expect(wrapper.text()).toContain('回收站');
  });

  it('should fetch documents on mount', async () => {
    w();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('document', 1, 10, '');
  });

  it('should store fetched data', async () => {
    mockGet.mockResolvedValue({ list: [mockDocument], total: 1 });
    const wrapper = w();
    await flushPromises();
    expect((wrapper.vm as any).tableData).toHaveLength(1);
    expect((wrapper.vm as any).pagination.total).toBe(1);
  });

  it('should switch tabs and fetch data', async () => {
    const wrapper = w();
    await flushPromises();

    // Switch to template tab
    (wrapper.vm as any).activeType = 'template';
    await (wrapper.vm as any).fetchData();
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith('template', 1, 10, '');
  });

  it('should switch to task tab and fetch data', async () => {
    const wrapper = w();
    await flushPromises();

    // Switch to task tab
    (wrapper.vm as any).activeType = 'task';
    await (wrapper.vm as any).fetchData();
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith('task', 1, 10, '');
  });

  it('should search with keyword', async () => {
    const wrapper = w();
    await flushPromises();

    (wrapper.vm as any).searchKeyword = 'test';
    (wrapper.vm as any).handleSearch();

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 600));
    await flushPromises();

    expect(mockGet).toHaveBeenCalledWith('document', 1, 10, 'test');
  });

  it('should restore item', async () => {
    const { ElMessageBox, ElMessage } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockPost.mockResolvedValue({});

    const wrapper = w();
    await flushPromises();

    await (wrapper.vm as any).handleRestore('doc-1');
    await flushPromises();

    expect(mockPost).toHaveBeenCalledWith('document', 'doc-1');
    expect(ElMessage.success).toHaveBeenCalledWith('恢复成功');
  });

  it('should cancel restore on user cancel', async () => {
    const { ElMessageBox } = await import('element-plus');
    (ElMessageBox.confirm as any).mockRejectedValue('cancel');

    const wrapper = w();
    await flushPromises();

    await (wrapper.vm as any).handleRestore('doc-1');
    await flushPromises();

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('should permanently delete item', async () => {
    const { ElMessageBox, ElMessage } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockDelete.mockResolvedValue({});

    const wrapper = w();
    await flushPromises();

    await (wrapper.vm as any).handlePermanentDelete('doc-1');
    await flushPromises();

    expect(mockDelete).toHaveBeenCalledWith('document', 'doc-1');
    expect(ElMessage.success).toHaveBeenCalledWith('删除成功');
  });

  it('should cancel permanent delete on user cancel', async () => {
    const { ElMessageBox } = await import('element-plus');
    (ElMessageBox.confirm as any).mockRejectedValue('cancel');

    const wrapper = w();
    await flushPromises();

    await (wrapper.vm as any).handlePermanentDelete('doc-1');
    await flushPromises();

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should handle restore error', async () => {
    const { ElMessageBox, ElMessage } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockPost.mockRejectedValue({ response: { data: { message: 'Restore failed' } } });

    const wrapper = w();
    await flushPromises();

    await (wrapper.vm as any).handleRestore('doc-1');
    await flushPromises();

    expect(ElMessage.error).toHaveBeenCalledWith('Restore failed');
  });

  it('should handle delete error', async () => {
    const { ElMessageBox, ElMessage } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockDelete.mockRejectedValue({ response: { data: { message: 'Delete failed' } } });

    const wrapper = w();
    await flushPromises();

    await (wrapper.vm as any).handlePermanentDelete('doc-1');
    await flushPromises();

    expect(ElMessage.error).toHaveBeenCalledWith('Delete failed');
  });

  it('should handle selection change', async () => {
    const wrapper = w();
    await flushPromises();

    const selection = [{ id: 'doc-1' }, { id: 'doc-2' }];
    (wrapper.vm as any).handleSelectionChange(selection);

    expect((wrapper.vm as any).selectedIds).toEqual(['doc-1', 'doc-2']);
  });

  it('should refresh data after restore', async () => {
    const { ElMessageBox } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockPost.mockResolvedValue({});
    mockGet.mockResolvedValue({ list: [], total: 0 });

    const wrapper = w();
    await flushPromises();

    mockGet.mockClear();
    await (wrapper.vm as any).handleRestore('doc-1');
    await flushPromises();

    // Should refresh data after restore
    expect(mockGet).toHaveBeenCalled();
  });

  it('should refresh data after permanent delete', async () => {
    const { ElMessageBox } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockDelete.mockResolvedValue({});
    mockGet.mockResolvedValue({ list: [], total: 0 });

    const wrapper = w();
    await flushPromises();

    mockGet.mockClear();
    await (wrapper.vm as any).handlePermanentDelete('doc-1');
    await flushPromises();

    // Should refresh data after delete
    expect(mockGet).toHaveBeenCalled();
  });

  it('should handle fetch data error', async () => {
    const { ElMessage } = await import('element-plus');
    mockGet.mockRejectedValue({ response: { data: { message: 'Fetch failed' } } });

    w();
    await flushPromises();

    expect(ElMessage.error).toHaveBeenCalledWith('Fetch failed');
  });
});
