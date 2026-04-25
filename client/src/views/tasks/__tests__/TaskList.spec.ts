import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import TaskList from '../TaskList.vue';

const mockPush = vi.fn();
vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { list: [], total: 0 } }),
  },
}));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

describe('TaskList navigation', () => {
  it('renders without error', async () => {
    const wrapper = mount(TaskList, {
      global: {
        stubs: [
          'el-page-header',
          'el-card',
          'el-button',
          'el-table',
          'el-table-column',
          'el-pagination',
          'el-select',
          'el-option',
          'el-input',
          'el-tag',
          'el-empty',
        ],
      },
    });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('exposes router.push for navigation', async () => {
    mount(TaskList, {
      global: {
        stubs: [
          'el-page-header',
          'el-card',
          'el-button',
          'el-table',
          'el-table-column',
          'el-pagination',
          'el-select',
          'el-option',
          'el-input',
          'el-tag',
          'el-empty',
        ],
      },
    });
    await flushPromises();
    // router is available via the mock; no navigation calls expected on mount
    expect(mockPush).not.toHaveBeenCalled();
  });
});
