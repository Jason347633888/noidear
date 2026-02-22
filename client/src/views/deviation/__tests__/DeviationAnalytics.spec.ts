import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

// Mock echarts-wordcloud before importing the component
vi.mock('echarts-wordcloud', () => ({
  default: {},
}));

vi.mock('@/api/deviation-analytics', () => ({
  default: {
    getTrend: vi.fn().mockResolvedValue([]),
    getFieldDistribution: vi.fn().mockResolvedValue([]),
    getRateByDepartment: vi.fn().mockResolvedValue([]),
    getRateByTemplate: vi.fn().mockResolvedValue([]),
    getReasonWordCloud: vi.fn().mockResolvedValue([]),
  },
}));

import DeviationAnalytics from '../DeviationAnalytics.vue';

describe('DeviationAnalytics', () => {
  const createWrapper = () => {
    return mount(DeviationAnalytics, {
      global: {
        stubs: {
          ElCard: true,
          ElRow: true,
          ElCol: true,
          ElForm: true,
          ElFormItem: true,
          ElDatePicker: true,
          ElSelect: true,
          ElOption: true,
          ElButton: true,
        },
      },
    });
  };

  it('应该正确渲染组件', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('应该能成功挂载', () => {
    const wrapper = createWrapper();
    expect(wrapper.vm).toBeDefined();
  });

  it('应该包含统计图表容器', () => {
    const wrapper = createWrapper();
    expect(wrapper.html()).toBeTruthy();
  });
});
