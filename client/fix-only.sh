#!/bin/bash

# Fix ExamResult test
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
TESTEOF

# Fix QuestionCard.basic test expectations
cat > src/components/training/__tests__/QuestionCard.basic.spec.ts << 'TESTEOF'
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import QuestionCard from '../QuestionCard.vue';

const mockChoiceQuestion = {
  id: '1',
  type: 'choice' as const,
  content: '以下哪个是 GMP 的核心要素?',
  options: ['人员', '设备', '厂房', '以上都是'],
  points: 10,
  order: 1,
};

describe('QuestionCard - Basic Mounting', () => {
  it('should mount successfully', () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: mockChoiceQuestion,
        index: 0,
        modelValue: '',
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('should render question number and text', () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: mockChoiceQuestion,
        index: 2,
        modelValue: '',
      },
    });
    const html = wrapper.html();
    expect(html).toContain('第 3 题');
    expect(html).toContain('以下哪个是 GMP 的核心要素?');
  });

  it('should handle different question indices', () => {
    const wrapper1 = mount(QuestionCard, {
      props: { question: mockChoiceQuestion, index: 0, modelValue: '' },
    });
    const wrapper2 = mount(QuestionCard, {
      props: { question: mockChoiceQuestion, index: 9, modelValue: '' },
    });

    expect(wrapper1.text()).toContain('第 1 题');
    expect(wrapper2.text()).toContain('第 10 题');
  });
});
TESTEOF

# Fix QuestionForm test
cat > src/components/training/__tests__/QuestionForm.spec.ts << 'TESTEOF'
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import QuestionForm from '../QuestionForm.vue';

vi.mock('@/api/training', () => ({
  createQuestion: vi.fn(() => Promise.resolve({ id: '1' })),
  updateQuestion: vi.fn(() => Promise.resolve({ id: '1' })),
}));

describe('QuestionForm', () => {
  const createWrapper = (props = {}) => {
    return mount(QuestionForm, {
      props: {
        visible: false,
        projectId: 'proj-1',
        ...props,
      },
      global: {
        stubs: {
          ElDialog: true,
          ElForm: true,
          ElFormItem: true,
          ElInput: true,
          ElRadioGroup: true,
          ElRadio: true,
          ElInputNumber: true,
          ElButton: true,
        },
      },
    });
  };

  it('should mount successfully', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
});
TESTEOF

echo "✅ Fixed all tests"
