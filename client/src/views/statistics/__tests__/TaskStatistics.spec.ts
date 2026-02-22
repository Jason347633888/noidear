import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';

const mockDispose = vi.fn();
const mockGet = vi.fn();

vi.mock('echarts', () => ({
  init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: mockDispose }),
  graphic: { LinearGradient: vi.fn() },
}));

vi.mock('@/api/request', () => ({
  default: { get: (...a: unknown[]) => mockGet(...a) },
}));
vi.mock('@/api/export', () => ({
  default: { exportStatistics: vi.fn().mockResolvedValue(new Blob()) },
}));

import TaskStatistics from '../TaskStatistics.vue';

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-row': { template: '<div><slot /></div>' },
  'el-col': { template: '<div><slot /></div>' },
  'el-form': { template: '<div><slot /></div>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-select': { template: '<div />' },
  'el-option': { template: '<div />' },
  'el-button': { template: '<button><slot /></button>' },
  'el-date-picker': { template: '<div />' },
  'el-progress': { template: '<div />' },
};

const okData = {
  total: 80,
  completionRate: 75,
  overdueRate: 10,
  avgCompletionTime: 24,
  byStatus: [
    { status: 'completed', count: 60 },
    { status: 'pending', count: 15 },
    { status: 'in_progress', count: 5 },
  ],
  byDepartment: [],
  byTemplate: [],
  trend: [],
};

describe('TaskStatistics', () => {
  let wrapper: VueWrapper;

  beforeEach(() => { vi.clearAllMocks(); mockGet.mockResolvedValue(okData); });
  afterEach(() => { wrapper?.unmount(); });

  it('renders correctly', () => {
    wrapper = mount(TaskStatistics, { global: { stubs } });
    expect(wrapper.exists()).toBe(true);
  });

  it('fetches data on mount', () => {
    wrapper = mount(TaskStatistics, { global: { stubs } });
    expect(mockGet).toHaveBeenCalledWith(
      '/statistics/tasks',
      expect.any(Object)
    );
  });

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValueOnce(new Error('fail'));
    wrapper = mount(TaskStatistics, { global: { stubs } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('handles empty trend data', async () => {
    mockGet.mockResolvedValueOnce({ total: 0, byStatus: [], trend: [] });
    wrapper = mount(TaskStatistics, { global: { stubs } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('handles null byDepartment', async () => {
    mockGet.mockResolvedValueOnce({ total: 0, byDepartment: null });
    wrapper = mount(TaskStatistics, { global: { stubs } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('disposes all charts on unmount', async () => {
    wrapper = mount(TaskStatistics, { global: { stubs } });
    await flushPromises();
    wrapper.unmount();
    expect(mockDispose).toHaveBeenCalled();
  });
});
