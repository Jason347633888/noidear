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
