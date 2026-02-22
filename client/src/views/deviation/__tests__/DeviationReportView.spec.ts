import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DeviationReportView from '../DeviationReportView.vue';

// Mock API
vi.mock('@/api/deviation', () => ({
  default: {
    getReports: vi.fn().mockResolvedValue({
      list: [
        {
          id: '1',
          fieldName: '温度',
          expectedValue: '180',
          actualValue: '190',
          deviationAmount: 5,
          reason: '设备故障',
          status: 'pending',
          createdAt: '2024-01-01',
        },
      ],
      total: 1,
    }),
  },
}));

describe('DeviationReportView', () => {
  const createWrapper = () => {
    return mount(DeviationReportView, {
      global: {
        stubs: {
          ElCard: true,
          ElTable: true,
          ElTableColumn: true,
          ElPagination: true,
          ElButton: true,
          ElForm: true,
          ElFormItem: true,
          ElInput: true,
          ElSelect: true,
          ElOption: true,
          ElDatePicker: true,
          ElTag: true,
          ElDialog: true,
        },
      },
    });
  };

  it('应该正确渲染组件', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('应该有分页功能', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;
    expect(vm.pagination).toBeDefined();
    expect(vm.pagination.page).toBe(1);
  });

  it('应该有筛选功能', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;
    expect(vm.filterForm).toBeDefined();
  });
});
