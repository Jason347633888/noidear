import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MaterialBatchSelect from '../MaterialBatchSelect.vue';
import { materialBatchApi } from '@/api/batch';

vi.mock('@/api/batch', () => ({
  materialBatchApi: {
    getList: vi.fn().mockResolvedValue([
      {
        id: 'batch-1',
        batchNumber: 'MB-001',
        quantity: 12,
        expiryDate: '2026-06-30',
        status: 'normal',
        material: { name: '白砂糖' },
        supplier: { name: '供应商A' },
      },
    ]),
  },
}));

const stubs = {
  'el-select': {
    template: '<select :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'disabled', 'remoteMethod', 'loading'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
};

describe('MaterialBatchSelect', () => {
  it('loads batches by materialId and renders human-readable labels', async () => {
    const wrapper = mount(MaterialBatchSelect, {
      props: { modelValue: '', materialId: 'material-1' },
      global: { stubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(materialBatchApi.getList).toHaveBeenCalledWith({
      materialId: 'material-1',
      keyword: '',
      limit: 20,
    });
    expect(wrapper.text()).toContain('MB-001 / 白砂糖 / 供应商A / 剩余 12 / 有效期 2026-06-30');
  });

  it('does not load batches when materialId is missing', async () => {
    vi.mocked(materialBatchApi.getList).mockClear();

    mount(MaterialBatchSelect, {
      props: { modelValue: '', materialId: '' },
      global: { stubs },
    });

    await Promise.resolve();

    expect(materialBatchApi.getList).not.toHaveBeenCalled();
  });
});
