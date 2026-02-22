import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ProjectList from '../ProjectList.vue';

vi.mock('@/api/training', () => ({
  fetchProjects: vi.fn(() => Promise.resolve({ list: [], total: 0 })),
  deleteProject: vi.fn(),
}));

describe('ProjectList', () => {
  const createWrapper = () => {
    return mount(ProjectList, {
      global: {
        stubs: {
          ElCard: true,
          ElForm: true,
          ElFormItem: true,
          ElSelect: true,
          ElOption: true,
          ElInput: true,
          ElButton: true,
          ElTable: true,
          ElTableColumn: true,
          ElTag: true,
          ElPagination: true,
          ElIcon: true,
        },
      },
    });
  };

  it('should mount successfully', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
});
