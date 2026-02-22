import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DeviationReasonDialog from '../deviation/DeviationReasonDialog.vue';

describe('DeviationReasonDialog', () => {
  const mockDeviations = [
    {
      fieldName: '温度',
      expectedValue: 180,
      actualValue: 190,
      deviationValue: 10,
      deviationRate: 5.56,
      toleranceType: 'range' as const,
      toleranceMin: 175,
      toleranceMax: 185,
    },
  ];

  const createWrapper = (props = {}) => {
    return mount(DeviationReasonDialog, {
      props: {
        visible: true,
        deviations: mockDeviations,
        ...props,
      },
      global: {
        stubs: {
          ElDialog: true,
          ElButton: true,
          ElInput: true,
          ElTable: true,
          ElTableColumn: true,
          ElForm: true,
          ElFormItem: true,
          ElAlert: true,
          ElTag: true,
        },
      },
    });
  };

  it('应该正确渲染组件', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('应该接收正确的 props', () => {
    const wrapper = createWrapper();
    expect(wrapper.props('visible')).toBe(true);
    expect(wrapper.props('deviations')).toEqual(mockDeviations);
  });

  it('应该验证偏离原因长度至少10个字符', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;
    expect(vm.rules.reason).toBeDefined();
    expect(vm.rules.reason.some((r: any) => r.min === 10)).toBe(true);
  });

  it('应该验证偏离原因长度最多500个字符', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;
    expect(vm.rules.reason.some((r: any) => r.max === 500)).toBe(true);
  });

  it('应该在关闭对话框时清空表单', async () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;
    vm.form.reason = '这是一个测试原因内容超过十个字';

    await wrapper.setProps({ visible: false });
    await wrapper.vm.$nextTick();

    expect(vm.form.reason).toBe('');
  });

  it('应该正确格式化期望值（范围公差）', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;
    const formatted = vm.formatValue(180, 'range', 175, 185);
    expect(formatted).toContain('180');
  });

  it('应该正确格式化期望值（百分比公差）', () => {
    const wrapper = createWrapper();
    const vm = wrapper.vm as any;
    const formatted = vm.formatValue(100, 'percentage', 80, 120);
    expect(formatted).toContain('%');
  });
});
