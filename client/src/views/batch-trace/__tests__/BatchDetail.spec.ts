import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import BatchDetail from '../BatchDetail.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'prod-batch-1' } }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/api/batch', () => ({
  productionBatchApi: {
    getById: vi.fn().mockResolvedValue({
      id: 'prod-batch-1',
      batchNumber: 'PB-001',
      productName: '蛋糕',
      productCode: 'P001',
      quantity: 100,
      unit: 'kg',
      status: 'in_progress',
      recipeId: 'recipe-1',
      materialUsages: [],
      aggregations: [],
    }),
  },
  materialUsageApi: {
    getByBatch: vi.fn().mockResolvedValue([]),
    addUsage: vi.fn(),
  },
  batchMixingAggregationApi: {
    create: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock('@/api/recipe', () => ({
  recipeApi: {
    getOne: vi.fn().mockResolvedValue({
      lines: [
        {
          id: 'line-1',
          material_id: 'material-1',
          qty_per_batch: 5,
          unit: 'kg',
          area_name_snapshot: '配料区',
        },
      ],
    }),
  },
}));

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn().mockResolvedValue([]),
  },
}));

const stubs = {
  'el-page-header': { template: '<header />' },
  'el-card': { template: '<section><slot name="header" /><slot /></section>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-descriptions': { template: '<dl><slot /></dl>' },
  'el-descriptions-item': { template: '<dd><slot /></dd>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<table><slot /></table>', props: ['data'] },
  'el-table-column': { template: '<td />' },
  'el-empty': { template: '<div />' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option :value="value">{{ label }}</option>', props: ['value', 'label'] },
  'el-input': { template: '<input :placeholder="placeholder" />', props: ['placeholder'] },
  'el-input-number': { template: '<input type="number" />' },
  MaterialBatchSelect: { template: '<select data-test="material-batch-select" />', props: ['materialId'] },
};

describe('BatchDetail GAP-202 material batch selector', () => {
  it('renders a MaterialBatchSelect instead of a free-text materialBatchId input', async () => {
    const wrapper = mount(BatchDetail, { global: { stubs } });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.find('input[placeholder="请输入物料批次 ID"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="material-batch-select"]').exists()).toBe(true);
  });
});
