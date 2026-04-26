import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockList = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listRecordFormIndex: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}));

const stubs = {
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-link': { template: '<a @click="$emit(\'click\')"><slot /></a>' },
  'el-tag': { template: '<span><slot /></span>' },
};

import RecordFormLandingIndex from '../RecordFormLandingIndex.vue';

describe('RecordFormLandingIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it('loads landing rows on mount', async () => {
    mount(RecordFormLandingIndex, { global: { stubs } });
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('opens target route without owning record data', async () => {
    const wrapper = mount(RecordFormLandingIndex, { global: { stubs } });
    await flushPromises();
    (wrapper.vm as any).openRoute('/process');
    expect(mockPush).toHaveBeenCalledWith('/process');
  });

  it('fetches rows with keyword filter on search', async () => {
    const wrapper = mount(RecordFormLandingIndex, { global: { stubs } });
    await flushPromises();
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);

    (wrapper.vm as any).keyword = 'test-code';
    await (wrapper.vm as any).fetchRows();
    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({ keyword: 'test-code' });
  });
});
