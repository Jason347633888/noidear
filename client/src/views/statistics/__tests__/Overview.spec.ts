import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';

const mockSetOption = vi.fn();
const mockResize = vi.fn();
const mockDispose = vi.fn();
const mockGet = vi.fn();

vi.mock('echarts', () => ({
  init: () => ({ setOption: mockSetOption, resize: mockResize, dispose: mockDispose }),
  graphic: { LinearGradient: vi.fn() },
}));

vi.mock('@/api/request', () => ({
  default: { get: (...a: unknown[]) => mockGet(...a) },
}));

import Overview from '../Overview.vue';

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-row': { template: '<div><slot /></div>' },
  'el-col': { template: '<div><slot /></div>' },
  'el-icon': { template: '<i />' },
  'el-select': { template: '<div />' },
  'el-option': { template: '<div />' },
};

const okData = {
  totals: { documents: 100, tasks: 50, approvals: 30 },
  monthly: { documents: 10, tasks: 5, approvals: 3 },
  metrics: { taskCompletionRate: 85, approvalPassRate: 92 },
  trends: { documents: [], tasks: [], approvals: [] },
};

describe('Overview', () => {
  let wrapper: VueWrapper;

  beforeEach(() => { vi.clearAllMocks(); mockGet.mockResolvedValue(okData); });
  afterEach(() => { wrapper?.unmount(); });

  it('renders correctly', () => {
    wrapper = mount(Overview, { global: { stubs } });
    expect(wrapper.exists()).toBe(true);
  });

  it('calls statistics API on mount', () => {
    wrapper = mount(Overview, { global: { stubs } });
    expect(mockGet).toHaveBeenCalled();
  });

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValueOnce(new Error('fail'));
    wrapper = mount(Overview, { global: { stubs } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('handles empty response', async () => {
    mockGet.mockResolvedValueOnce({});
    wrapper = mount(Overview, { global: { stubs } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('handles null metrics', async () => {
    mockGet.mockResolvedValueOnce({ totals: null, metrics: null });
    wrapper = mount(Overview, { global: { stubs } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
  });

  it('disposes chart on unmount', async () => {
    wrapper = mount(Overview, { global: { stubs } });
    await flushPromises();
    wrapper.unmount();
    expect(mockDispose).toHaveBeenCalled();
  });
});
