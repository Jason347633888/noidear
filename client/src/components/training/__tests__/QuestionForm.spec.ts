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
        question: null,
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

  it('should mount successfully with closed dialog', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('should initialize with default form values', () => {
    const wrapper = createWrapper();
    expect(wrapper.vm.form.type).toBe('choice');
    expect(wrapper.vm.form.points).toBe(5);
  });

  it('should load question data when question prop is provided', async () => {
    const mockQuestion = {
      id: '1',
      type: 'choice' as const,
      content: '测试题目',
      options: ['选项A', '选项B', '选项C', '选项D'],
      correctAnswer: 'A',
      points: 10,
      order: 1,
    };

    const wrapper = createWrapper({ question: mockQuestion });
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.form.content).toBe('测试题目');
    expect(wrapper.vm.form.points).toBe(10);
    expect(wrapper.vm.form.optionA).toBe('选项A');
  });
});
