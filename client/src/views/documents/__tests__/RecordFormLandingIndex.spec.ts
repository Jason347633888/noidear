import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { computed, inject, provide, type Ref } from 'vue';

const mockList = vi.fn();
const mockPatch = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listRecordFormIndex: (...args: unknown[]) => mockList(...args),
    updateRecordFormIndex: (code: string, payload: Record<string, unknown>) =>
      mockPatch(`/documents/record-form-index/${code}`, payload),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
}));

const stubs = {
  'el-input': {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
  },
  'el-button': { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
  'el-table': {
    props: ['data'],
    setup(props: { data: unknown[] }) {
      provide(
        'tableRows',
        computed(() => props.data),
      );
    },
    template: '<div><slot /></div>',
  },
  'el-table-column': {
    setup() {
      const rows = inject<Ref<unknown[]>>('tableRows');
      return { rows };
    },
    template: '<div><template v-for="row in rows" :key="row.code"><slot :row="row" /></template></div>',
  },
  'el-link': { template: '<a @click="$emit(\'click\')"><slot /></a>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue'] },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<label><slot /></label>' },
};

const mountOptions = { global: { stubs, directives: { loading: {} } } };

import RecordFormLandingIndex from '../RecordFormLandingIndex.vue';

describe('RecordFormLandingIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockPatch.mockResolvedValue({});
  });

  it('loads landing rows on mount', async () => {
    mount(RecordFormLandingIndex, mountOptions);
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('opens target route without owning record data', async () => {
    const wrapper = mount(RecordFormLandingIndex, mountOptions);
    await flushPromises();
    (wrapper.vm as any).openRoute('/process');
    expect(mockPush).toHaveBeenCalledWith('/process');
  });

  it('fetches rows with keyword filter on search', async () => {
    const wrapper = mount(RecordFormLandingIndex, mountOptions);
    await flushPromises();
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);

    (wrapper.vm as any).keyword = 'test-code';
    await (wrapper.vm as any).fetchRows();
    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({ keyword: 'test-code' });
  });

  it('opens edit dialog and saves landing entry', async () => {
    mockList.mockResolvedValue([
      {
        code: 'F1',
        formName: '表单1',
        department: '品质部',
        chain: '研发/变更',
        entities: [],
        basis: '',
        templateGroupId: 'G1',
        landingEntry: null,
      },
    ]);
    mockPatch.mockResolvedValue({});

    const wrapper = mount(RecordFormLandingIndex, mountOptions);
    await flushPromises();
    await wrapper.find('[data-test="edit-landing-F1"]').trigger('click');
    await wrapper.find('[data-test="target-route-input"]').setValue('/records/templates/tpl1');
    await wrapper.find('[data-test="save-landing"]').trigger('click');
    await flushPromises();

    expect(mockPatch).toHaveBeenCalledWith(
      '/documents/record-form-index/F1',
      expect.objectContaining({
        targetRoute: '/records/templates/tpl1',
      }),
    );
  });
});
