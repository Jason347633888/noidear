import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockListDocuments = vi.fn();
const mockPush = vi.fn();
let mockRoute = { query: {} as Record<string, string> };

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listDocuments: (...args: unknown[]) => mockListDocuments(...args),
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
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot />{{ data.map((item) => item.title).join(",") }}</div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-pagination': { template: '<div />', props: ['currentPage', 'pageSize', 'pageSizes', 'total', 'layout'] },
};

import SystemFileLibrary from '../SystemFileLibrary.vue';

const mountOptions = { global: { stubs, directives: { loading: {} } } };

describe('SystemFileLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute = { query: {} };
    mockListDocuments.mockResolvedValue({ list: [], total: 0, page: 1, limit: 50 });
  });

  it('loads documents on mount', async () => {
    mount(SystemFileLibrary, mountOptions);
    await flushPromises();
    expect(mockListDocuments).toHaveBeenCalled();
  });

  it('initializes external-file filter from route issue before fetching', async () => {
    mockRoute = { query: { issue: 'expiringExternalFiles' } };

    mount(SystemFileLibrary, mountOptions);
    await flushPromises();

    expect(mockListDocuments).toHaveBeenCalledWith(expect.objectContaining({ documentType: 'EXTERNAL_FILE' }));
  });

  it('initializes due-for-review status filter from route issue before fetching', async () => {
    mockRoute = { query: { issue: 'dueForReview' } };

    mount(SystemFileLibrary, mountOptions);
    await flushPromises();

    expect(mockListDocuments).toHaveBeenCalledWith(expect.objectContaining({
      status: 'effective',
      dueWithinDays: 30,
    }));
  });

  it('initializes missing-metadata issue filter from route issue before fetching', async () => {
    mockRoute = { query: { issue: 'missingMetadata' } };

    mount(SystemFileLibrary, mountOptions);
    await flushPromises();

    expect(mockListDocuments).toHaveBeenCalledWith(expect.objectContaining({ issue: 'missingMetadata' }));
  });

  it('filters by selected source folder', async () => {
    const wrapper = mount(SystemFileLibrary, mountOptions);
    await flushPromises();
    await (wrapper.vm as any).selectFolder('02');
    expect(mockListDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ sourceFolder: '02', page: 1, limit: 50 }));
  });

  it('loads the selected page', async () => {
    const wrapper = mount(SystemFileLibrary, mountOptions);
    await flushPromises();
    await (wrapper.vm as any).handlePageChange(2);
    expect(mockListDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 50 }));
  });

  it('resets to the first page when page size changes', async () => {
    const wrapper = mount(SystemFileLibrary, mountOptions);
    await flushPromises();
    await (wrapper.vm as any).handlePageChange(2);
    await (wrapper.vm as any).handlePageSizeChange(100);
    expect(mockListDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 100 }));
  });

  it('excludes record form index documents from the system library', async () => {
    mockListDocuments.mockResolvedValue({
      list: [
        { id: 'doc-1', number: 'QM-001', title: '质量手册', status: 'effective', document_type: 'MANUAL', source_folder: '01' },
        {
          id: 'doc-2',
          number: 'JL-001',
          title: '记录表单索引',
          status: 'effective',
          document_type: 'RECORD_FORM_INDEX',
          source_folder: '04',
        },
      ],
      total: 2,
      page: 1,
      limit: 50,
    });

    const wrapper = mount(SystemFileLibrary, mountOptions);
    await flushPromises();

    expect(wrapper.text()).toContain('质量手册');
    expect(wrapper.text()).not.toContain('记录表单索引');
  });
});
