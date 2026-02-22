import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ExamPage from '../ExamPage.vue';

vi.mock('@/api/exam', () => ({
  startExam: vi.fn(() => Promise.resolve({ examId: '1', questions: [], duration: 60 })),
  submitExam: vi.fn(),
}));

vi.mock('@/api/training', () => ({
  fetchProjectById: vi.fn(() => Promise.resolve({ id: '1', title: 'Test' })),
}));

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { projectId: '1' } })),
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
}));

describe('ExamPage', () => {
  const createWrapper = () => {
    return mount(ExamPage, {
      global: {
        stubs: {
          ElCard: true,
          ElSteps: true,
          ElStep: true,
          ElButton: true,
          ElProgress: true,
          QuestionCard: true,
          ExamResult: true,
        },
      },
    });
  };

  it('should mount successfully', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
});
