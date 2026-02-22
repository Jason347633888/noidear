import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import QuestionCard from '../QuestionCard.vue';

vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: { error: vi.fn(), success: vi.fn() },
  };
});

describe('QuestionCard', () => {
  const mockChoiceQuestion = {
    id: '1',
    type: 'choice' as const,
    content: '以下哪个是 GMP 的核心要素?',
    options: ['人员', '设备', '厂房', '以上都是'],
    points: 10,
    order: 1,
  };

  const createWrapper = (props = {}) => {
    return mount(QuestionCard, {
      props: {
        question: mockChoiceQuestion,
        index: 0,
        modelValue: '',
        ...props,
      },
      global: {
        stubs: {
          ElTag: true,
          ElRadioGroup: true,
          ElRadio: true,
        },
      },
    });
  };

  it('should mount successfully', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('should render question content', () => {
    const wrapper = createWrapper();
    expect(wrapper.text()).toContain('以下哪个是 GMP 的核心要素?');
  });

  it('should handle answer change', async () => {
    const wrapper = createWrapper();
    await wrapper.vm.handleAnswerChange('B');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['B']);
  });
});
