import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import BatchManagement from '../BatchManagement.vue';

vi.mock('@/api/warehouse', () => ({
  batchApi: {
    getList: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  },
}));

const stubs = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option :value="value">{{ label }}</option>', props: ['value', 'label'] },
  'el-button': { template: '<button><slot /></button>' },
  'el-table': { template: '<table><slot /></table>', props: ['data', 'loading', 'stripe'] },
  'el-table-column': { template: '<td></td>', props: ['prop', 'label', 'width', 'minWidth'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'size'] },
  'el-pagination': { template: '<nav />' },
};

describe('BatchManagement', () => {
  it('uses backend BatchStatus enum values in the status filter', () => {
    const wrapper = mount(BatchManagement, { global: { stubs } });

    const optionValues = wrapper.findAll('option').map((option) => option.attributes('value'));

    expect(optionValues).toEqual(['normal', 'expired', 'locked']);
    expect(optionValues).not.toContain('available');
    expect(optionValues).not.toContain('reserved');
    expect(optionValues).not.toContain('consumed');
  });
});
