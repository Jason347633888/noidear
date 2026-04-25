import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import TaskCreate from '../TaskCreate.vue';

const mockCreateTask = vi.fn().mockResolvedValue({ id: 'task-1' });
vi.mock('@/api/task', () => ({
  default: {
    createTask: (...args: unknown[]) => mockCreateTask(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

describe('TaskCreate', () => {
  it('renders the create form', async () => {
    const wrapper = mount(TaskCreate, {
      global: {
        stubs: ['el-form', 'el-form-item', 'el-input', 'el-select', 'el-option', 'el-date-picker', 'el-button', 'el-card'],
      },
    });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('calls createTask when form is valid and submitted', async () => {
    const wrapper = mount(TaskCreate, {
      global: {
        stubs: ['el-form', 'el-form-item', 'el-input', 'el-select', 'el-option', 'el-date-picker', 'el-button', 'el-card'],
      },
    });
    const vm = wrapper.vm as any;
    vm.form.templateId = 'tmpl-1';
    vm.form.departmentId = 'dept-1';
    vm.form.deadline = '2099-12-31T00:00:00.000Z';
    await vm.handleSubmit();
    await flushPromises();
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      templateId: 'tmpl-1',
      departmentId: 'dept-1',
    }));
  });
});
