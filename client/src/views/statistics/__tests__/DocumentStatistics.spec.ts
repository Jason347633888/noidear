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

import DocumentStatistics from '../DocumentStatistics.vue';

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
};

const okData = {
  total: 120,
  byLevel: [
    { level: 1, count: 40 },
    { level: 2, count: 50 },
    { level: 3, count: 30 },
  ],
  byStatus: [
    { status: 'approved', count: 80 },
    { status: 'draft', count: 30 },
    { status: 'pending', count: 10 },
  ],
  byDepartment: [],
  growthRate: 12,
};

describe('DocumentStatistics', () => {
  let wrapper: VueWrapper;

  beforeEach(() => { vi.clearAllMocks(); mockGet.mockResolvedValue(okData); });
  afterEach(() => { wrapper?.unmount(); });

  it('renders correctly', () => {
    wrapper = mount(DocumentStatistics, { global: { stubs } });
    expect(wrapper.exists()).toBe(true);
  });

  it('fetches data on mount', () => {
    wrapper = mount(DocumentStatistics, { global: { stubs } });
    expect(mockGet).toHaveBeenCalledWith(
      '/statistics/documents',
      expect.any(Object)
    );
  });

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValueOnce(new Error('fail'));
    wrapper = mount(DocumentStatistics, { global: { stubs } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('handles empty byStatus array', async () => {
    mockGet.mockResolvedValueOnce({ total: 0, byStatus: [], byLevel: [] });
    wrapper = mount(DocumentStatistics, { global: { stubs } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('disposes all charts on unmount', async () => {
    wrapper = mount(DocumentStatistics, { global: { stubs } });
    await flushPromises();
    wrapper.unmount();
    expect(mockDispose).toHaveBeenCalled();
  });
});
