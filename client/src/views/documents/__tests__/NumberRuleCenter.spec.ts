import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listNumberRules: vi.fn().mockResolvedValue({ data: [{ id: 'rule-1', scope: 'document', sourceFolder: '03', prefix: 'GRSS', categoryCode: 'ZD', format: '{prefix}-{departmentCode}-{categoryCode}-{sequence}', usedCount: 3, isActive: true }] }),
    upsertNumberRule: vi.fn().mockResolvedValue({ data: {} }),
    deactivateNumberRule: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}));

import NumberRuleCenter from '../NumberRuleCenter.vue';
import { documentControlApi } from '@/api/document-control';

const stubs = {
  'el-card': { template: '<div><slot /></div>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-button': { template: '<button><slot /></button>' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>', props: ['modelValue', 'title'] },
  'el-form': { template: '<form><slot /></form>', props: ['model'] },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': { template: '<input />' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option />' },
  'el-input-number': { template: '<input type="number" />' },
  'el-switch': { template: '<input type="checkbox" />' },
  'el-tag': { template: '<span><slot /></span>' },
};

describe('NumberRuleCenter', () => {
  it('renders configured document number rules', async () => {
    const wrapper = mount(NumberRuleCenter, {
      global: { stubs },
    });
    await flushPromises();
    expect(documentControlApi.listNumberRules).toHaveBeenCalled();
    expect(wrapper.text()).toContain('编号规则');
  });
});
