import { mount } from '@vue/test-utils';
import TraceabilityQuery from '@/views/traceability/TraceabilityQuery.vue';

vi.mock('@/api/traceability', () => ({
  traceabilityApi: {
    query: vi.fn(),
    graph: vi.fn(),
    createLinkage: vi.fn(),
    export: vi.fn(),
  },
}));

describe('TraceabilityQuery', () => {
  it('switches between object and scenario entry without changing the result shell', async () => {
    const wrapper = mount(TraceabilityQuery, {
      global: {
        stubs: {
          'el-card': { template: '<div><slot /></div>' },
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<div><slot /></div>' },
          'el-segmented': { template: '<div />' },
          ObjectTraceQueryPanel: { template: '<div />' },
          ScenarioWorkbenchPanel: { template: '<div />' },
          TraceLedgerView: { template: '<div />' },
          TraceGraphView: { template: '<div />' },
          TraceRiskPanel: { template: '<div />' },
        },
      },
    });

    expect(wrapper.text()).toContain('对象查询');
    expect(wrapper.text()).toContain('场景工作台');
    expect(wrapper.text()).toContain('台账视图');
    expect(wrapper.text()).toContain('链路图视图');
  });
});
