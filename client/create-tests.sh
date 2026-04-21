#!/bin/bash
# Create ExamResult test file
cat > src/components/training/__tests__/ExamResult.spec.ts << 'TESTEOF'
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

  const mockFailedResult = {
    passed: false,
    score: 55,
    correctCount: 11,
    totalCount: 20,
    remainingAttempts: 1,
  };

  const createWrapper = (props = {}) => {
    return mount(ExamResult, {
      props: {
        result: mockPassedResult,
        ...props,
      },
      global: {
        stubs: {
          ElResult: true,
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

  it('should display score correctly', () => {
    const wrapper = createWrapper({ result: mockPassedResult });
    expect(wrapper.text()).toContain('85 分');
  });

  it('should emit retry event when retry button clicked', async () => {
    const wrapper = createWrapper({ result: mockFailedResult });
    await wrapper.vm.handleRetry();
    expect(wrapper.emitted('retry')).toBeTruthy();
  });

  it('should emit back event when back button clicked', async () => {
    const wrapper = createWrapper();
    await wrapper.vm.handleBack();
    expect(wrapper.emitted('back')).toBeTruthy();
  });
});
TESTEOF

echo "Created ExamResult.spec.ts"
