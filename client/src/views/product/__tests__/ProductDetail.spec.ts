import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';

function makeTableStub() {
  return {
    props: ['data'],
    setup(props: any, { slots }: any) {
      return () => {
        const rows = props.data || [];
        return h(
          'div',
          { class: 'el-table-stub' },
          rows.map((row: any, idx: number) => {
            const vnodes = slots.default ? slots.default({ row }) : [];
            // Walk each column vnode and inject `row` into its props so the
            // column stub can pass it into its own scoped slot.
            const stamped = vnodes.map((vnode: any, cidx: number) =>
              h(vnode.type as any, { ...(vnode.props || {}), key: cidx, row }, vnode.children),
            );
            return h('div', { class: 'el-table-row', key: idx }, stamped);
          }),
        );
      };
    },
  };
}

function makeTableColumnStub() {
  return {
    props: ['label', 'prop', 'row'],
    setup(props: any, { slots }: any) {
      return () => {
        const row = props.row;
        if (slots.default) {
          return h('span', { class: 'el-table-column-stub' }, slots.default({ row }));
        }
        return h(
          'span',
          { class: 'el-table-column-stub' },
          row && props.prop ? String(row[props.prop] ?? '') : '',
        );
      };
    },
  };
}

const mockGetWorkbench = vi.fn();
const mockUpdate = vi.fn();
const mockPush = vi.fn();
const mockRetry = vi.fn().mockResolvedValue({});
const mockGetByPlanId = vi.fn();
const mockConfirm = vi.fn().mockResolvedValue('confirm');

vi.mock('@/api/product', () => ({
  productApi: {
    getWorkbench: (...args: unknown[]) => mockGetWorkbench(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
  getProductStatusText: (status: string) =>
    status === 'active' ? '在产' : status === 'inactive' ? '停产' : status,
}));

vi.mock('@/api/product-process-change', () => ({
  productProcessChangeApi: {
    retry: (...args: unknown[]) => mockRetry(...args),
    getByPlanId: (...args: unknown[]) => mockGetByPlanId(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'prod-1' } }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: (...args: unknown[]) => mockConfirm(...args) },
}));

const stubs: Record<string, any> = {
  'el-button': {
    props: ['type', 'link', 'loading'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  'el-icon': { template: '<span><slot /></span>' },
  'el-descriptions': { template: '<div><slot /></div>' },
  'el-descriptions-item': {
    props: ['label'],
    template: '<div><span>{{ label }}：</span><slot /></div>',
  },
  'el-table': makeTableStub(),
  'el-table-column': makeTableColumnStub(),
  'el-alert': {
    props: ['title', 'type'],
    template: '<div class="alert">{{ title }}</div>',
  },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': { template: '<input />' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option />' },
};

import ProductDetail from '../ProductDetail.vue';

describe('ProductDetail workbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows official data and in-progress plan separately', async () => {
    mockGetWorkbench.mockResolvedValue({
      product: { id: 'prod-1', code: 'P-001', name: '椰丝咸蛋糕', status: 'active' },
      currentRecipe: { id: 'recipe-v3', version: 3, lines: [] },
      archivedRecipes: [],
      processSteps: [],
      archivedProcessSteps: [],
      activePlan: { status: 'pending_approval', scopes: ['recipe'], payloadJson: {} },
      ccpPoints: [],
      archivedCcpPoints: [],
      failureTodos: [],
      relatedChanges: [],
    });

    const wrapper = mount(ProductDetail, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('当前正式数据');
    expect(wrapper.text()).toContain('进行中的产品工艺变更方案');
    expect(wrapper.text()).toContain('未生效，不能作为生产依据');
  });

  it('shows archived recipes and related change events in history sections', async () => {
    mockGetWorkbench.mockResolvedValue({
      product: { id: 'prod-1', code: 'P-001', name: '椰丝咸蛋糕', status: 'active' },
      currentRecipe: { id: 'recipe-v4', version: 4, lines: [] },
      archivedRecipes: [
        { id: 'recipe-v3', version: 3, status: 'archived', changeEventId: 'change-1' },
      ],
      processSteps: [],
      archivedProcessSteps: [
        {
          id: 'step-old',
          step_no: 1,
          step_name: '旧烘烤参数',
          deleted_at: '2026-04-30T00:00:00.000Z',
        },
      ],
      activePlan: null,
      ccpPoints: [],
      archivedCcpPoints: [],
      failureTodos: [],
      relatedChanges: [
        { id: 'change-1', change_no: 'CE-2026-0001', status: 'executed' },
      ],
    });

    const wrapper = mount(ProductDetail, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('历史版本');
    expect(wrapper.text()).toContain('v3');
    expect(wrapper.text()).toContain('CE-2026-0001');
  });

  it('renders failure block when failureTodos is non-empty and triggers retry', async () => {
    mockGetWorkbench.mockResolvedValue({
      product: { id: 'prod-1', code: 'P-001', name: '测试产品', status: 'active' },
      currentRecipe: null,
      archivedRecipes: [],
      processSteps: [],
      archivedProcessSteps: [],
      activePlan: null,
      ccpPoints: [],
      archivedCcpPoints: [],
      failureTodos: [
        {
          id: 't-1',
          relatedId: 'plan-1',
          description: 'recipe area missing',
          createdAt: '2026-04-30T00:00:00Z',
        },
      ],
      relatedChanges: [],
    } as any);

    const wrapper = mount(ProductDetail, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('执行失败');
    expect(wrapper.text()).toContain('recipe area missing');

    await wrapper.find('[data-test="retry-failure"]').trigger('click');
    await flushPromises();

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockRetry).toHaveBeenCalledWith('plan-1');
  });

  it('renders active and archived ccp tables', async () => {
    mockGetWorkbench.mockResolvedValue({
      product: { id: 'prod-1', code: 'P-001', name: '测试', status: 'active' },
      currentRecipe: null,
      archivedRecipes: [],
      processSteps: [],
      archivedProcessSteps: [],
      activePlan: null,
      ccpPoints: [
        {
          id: 'a1',
          ccp_no: 'CCP-01',
          hazard_type: 'biological',
          control_measure: '',
          critical_limit: '',
          process_step_id: 's',
        },
      ],
      archivedCcpPoints: [
        {
          id: 'a2',
          ccp_no: 'CCP-OLD',
          hazard_type: 'chemical',
          control_measure: '',
          critical_limit: '',
          process_step_id: 's',
          deleted_at: '2026-01-01T00:00:00Z',
        },
      ],
      failureTodos: [],
      relatedChanges: [],
    } as any);

    const wrapper = mount(ProductDetail, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('CCP 控制点');
    expect(wrapper.text()).toContain('CCP-01');
    expect(wrapper.text()).toContain('CCP-OLD');
  });
});
