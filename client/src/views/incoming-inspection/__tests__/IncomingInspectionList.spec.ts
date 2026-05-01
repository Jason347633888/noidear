import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import IncomingInspectionList from '../IncomingInspectionList.vue';
import incomingInspectionApi from '@/api/incoming-inspection';
import { batchApi } from '@/api/warehouse';

vi.mock('@/api/incoming-inspection', () => ({
  default: {
    getList: vi.fn(),
    create: vi.fn(),
    getReports: vi.fn(),
  },
  getOverallResultText: (value: string) => ({ pass: '合格', fail: '不合格', conditional_pass: '有条件合格' }[value] || value),
  getOverallResultTagType: (value: string) => (value === 'pass' ? 'success' : value === 'fail' ? 'danger' : 'warning'),
}));

vi.mock('@/api/warehouse', () => ({
  batchApi: {
    getList: vi.fn(),
  },
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

const batchRows = [
  {
    id: 'batch-1',
    batchNumber: 'MB-2026-001',
    quantity: 120,
    status: 'normal',
    material: { id: 'mat-1', name: '白砂糖', code: 'M-SUGAR', category: 'raw', unit: 'kg', currentStock: 120, status: 'active', createdAt: '', updatedAt: '' },
    supplier: { id: 'sup-1', name: '合格供应商', code: 'S-001', status: 'active', createdAt: '' },
  },
];

const stubs = {
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
  'el-input': { template: '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'type', 'rows', 'style'] },
  'el-input-number': { template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />', props: ['modelValue', 'min', 'placeholder', 'style'] },
  'el-divider': { template: '<hr />', props: ['contentPosition'] },
};

describe('IncomingInspectionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(incomingInspectionApi.getList).mockResolvedValue([]);
    vi.mocked(incomingInspectionApi.create).mockResolvedValue({} as any);
    vi.mocked(batchApi.getList).mockResolvedValue({ list: batchRows, total: 1, page: 1, limit: 20 } as any);
  });

  it('uses a searchable material batch selector instead of a free text batch id input', async () => {
    const wrapper = mount(IncomingInspectionList, { global: { stubs } });
    await flushPromises();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(batchApi.getList).toHaveBeenCalledWith({ page: 1, limit: 20, status: 'normal' });
    expect(wrapper.text()).toContain('物料批次');
    expect(wrapper.text()).not.toContain('物料批次ID');
    expect(wrapper.find('input[placeholder="请输入物料批次 ID"]').exists()).toBe(false);
    expect(wrapper.find('select[data-placeholder="请选择物料批次"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('MB-2026-001 / 白砂糖');
  });

  it('submits the selected MaterialBatch id as material_batch_id', async () => {
    const wrapper = mount(IncomingInspectionList, { global: { stubs } });
    await flushPromises();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    const selects = wrapper.findAll('select');
    await selects[0].setValue('batch-1');
    await selects[1].setValue('pass');

    const confirmButtons = wrapper.findAll('button');
    await confirmButtons[confirmButtons.length - 1].trigger('click');
    await flushPromises();

    expect(incomingInspectionApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        material_batch_id: 'batch-1',
        overall_result: 'pass',
      }),
    );
  });
});
