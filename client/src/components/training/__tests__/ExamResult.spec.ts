import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ExamResult from '../ExamResult.vue';

describe('ExamResult', () => {
  const mockPassedResult = {
    passed: true,
    score: 85,
    correctCount: 17,
    totalCount: 20,
    remainingAttempts: 2,
  };

  const createWrapper = (props = {}) => {
    return mount(ExamResult, {
      props: {
        result: mockPassedResult,
        ...props,
      },
      global: {
        stubs: {
          ElResult: {
            template: '<div><slot /><slot name="sub-title" /><slot name="extra" /></div>',
          },
          ElButton: true,
          ElStatistic: true,
        },
      },
    });
  };

  it('should mount successfully', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('should emit retry event', async () => {
    const wrapper = createWrapper();
    await wrapper.vm.handleRetry();
    expect(wrapper.emitted('retry')).toBeTruthy();
  });

  it('should emit back event', async () => {
    const wrapper = createWrapper();
    await wrapper.vm.handleBack();
    expect(wrapper.emitted('back')).toBeTruthy();
  });
});
