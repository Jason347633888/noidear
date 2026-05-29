import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import IncomingInspectionList from '../IncomingInspectionList.vue';
import incomingInspectionApi from '@/api/incoming-inspection';

vi.mock('@/api/incoming-inspection', () => ({
  default: {
    getList: vi.fn(),
    create: vi.fn(),
    getReports: vi.fn(),
  },
  getOverallResultText: (value: string) => ({ pass: '合格', fail: '不合格', conditional_pass: '有条件合格' }[value] || value),
  getOverallResultTagType: (value: string) => (value === 'pass' ? 'success' : value === 'fail' ? 'danger' : 'warning'),
}));

vi.mock('@/api/file-preview', () => ({
  default: {
    getPreviewInfo: vi.fn(),
  },
}));

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  };
});

const stubs = {
  PageHeaderBlock: {
    template: '<header><slot /><slot name="actions" /></header>',
    props: ['eyebrow', 'title'],
  },
  'el-card': { template: '<section><slot name="header" /><slot /></section>' },
  'el-button': { template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['type', 'loading', 'disabled'] },
  'el-icon': { template: '<i><slot /></i>' },
  'el-table': { template: '<table><slot /></table>', props: ['data', 'loading', 'stripe'] },
  'el-table-column': { template: '<td><slot name="default" :row="{}" /></td>', props: ['prop', 'label', 'width', 'minWidth', 'showOverflowTooltip', 'fixed'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'effect', 'size'] },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue', 'title', 'width', 'closeOnClickModal'] },
  'el-form': { template: '<form><slot /></form>', methods: { validate: () => Promise.resolve(true) }, props: ['model', 'rules', 'labelWidth'] },
  'el-form-item': { template: '<label><span>{{ label }}</span><slot /></label>', props: ['label', 'prop'] },
  'el-select': {
    template: '<select :data-placeholder="placeholder" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder', 'filterable', 'remote', 'remoteMethod', 'loading', 'clearable', 'reserveKeyword', 'style'],
  },
  'el-option': { template: '<option :value="value">{{ label }}</option>', props: ['label', 'value'] },
  'el-input': { template: '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'type', 'rows', 'clearable', 'style'] },
  'el-input-number': { template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />', props: ['modelValue', 'min', 'placeholder', 'style'] },
  'el-switch': { template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />', props: ['modelValue'] },
  'el-divider': { template: '<hr />', props: ['contentPosition'] },
};

describe('IncomingInspectionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(incomingInspectionApi.getList).mockResolvedValue([]);
    vi.mocked(incomingInspectionApi.create).mockResolvedValue({} as any);
  });

  it('collects the inbound item id instead of a material batch selector', async () => {
    const wrapper = mount(IncomingInspectionList, { global: { stubs } });
    await flushPromises();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('入库明细ID');
    expect(wrapper.text()).not.toContain('物料批次');
    expect(wrapper.find('input[placeholder="请输入待检验的入库明细ID"]').exists()).toBe(true);
  });

  it('submits material_inbound_item_id (never material_batch_id) on create', async () => {
    const wrapper = mount(IncomingInspectionList, { global: { stubs } });
    await flushPromises();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    const inboundItemInput = wrapper.find('input[placeholder="请输入待检验的入库明细ID"]');
    await inboundItemInput.setValue('item-1');
    const selects = wrapper.findAll('select');
    await selects[0].setValue('pass');

    const confirmButtons = wrapper.findAll('button');
    await confirmButtons[confirmButtons.length - 1].trigger('click');
    await flushPromises();

    expect(incomingInspectionApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        material_inbound_item_id: 'item-1',
        overall_result: 'pass',
      }),
    );
    const payload = vi.mocked(incomingInspectionApi.create).mock.calls[0][0];
    expect(payload).not.toHaveProperty('material_batch_id');
  });
});
