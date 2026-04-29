import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockGetList = vi.fn();
const mockArchive = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/product', () => ({
  productApi: {
    getList: (...args: unknown[]) => mockGetList(...args),
    archive: (...args: unknown[]) => mockArchive(...args),
    update: vi.fn(),
  },
  getProductStatusText: (status: string) => (status === 'active' ? '在产' : status),
  getProductStatusType: () => 'success',
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot name="header" /><slot /></div>' },
  'el-table': {
    props: ['data'],
    template: '<div><slot v-for="row in data" :row="row" /></div>',
  },
  'el-table-column': {
    props: ['label', 'prop'],
    template: '<div><slot :row="{ id: \'prod-1\', code: \'P-001\', name: \'产品A\', status: \'active\' }" /></div>',
  },
  'el-button': {
    props: ['type', 'link', 'loading'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  'el-icon': { template: '<span><slot /></span>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-form': { template: '<form><slot /></form>', methods: { validate: () => Promise.resolve(true) } },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-input': { template: '<input />' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option />' },
  LegacyProductDrawer: { template: '<div />' },
};

import ProductList from '../ProductList.vue';

const mountProductList = () => mount(ProductList, { global: { stubs } });

describe('ProductList archive UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetList.mockResolvedValue([{ id: 'prod-1', code: 'P-001', name: '产品A', status: 'active' }]);
  });

  it('uses archive wording instead of delete wording', async () => {
    const wrapper = mountProductList();
    await flushPromises();

    expect(wrapper.findAll('button').some((b) => b.text() === '归档')).toBe(true);
    expect(wrapper.findAll('button').every((b) => b.text() !== '删除')).toBe(true);
    expect(wrapper.text()).not.toContain('确定删除');
    expect(wrapper.text()).not.toContain('不可撤销');
  });

  it('archives a product and reloads the list', async () => {
    const { ElMessageBox, ElMessage } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockArchive.mockResolvedValue({ id: 'prod-1' });
    const wrapper = mountProductList();
    await flushPromises();
    mockGetList.mockClear();

    await (wrapper.vm as any).handleArchive({ id: 'prod-1', name: '产品A' });
    await flushPromises();

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '确定要归档产品「产品A」吗？归档后产品、配方和工序将退出正常业务，历史追溯记录会保留。',
      '归档确认',
      { confirmButtonText: '确定归档', cancelButtonText: '取消', type: 'warning' },
    );
    expect(mockArchive).toHaveBeenCalledWith('prod-1');
    expect(ElMessage.success).toHaveBeenCalledWith('归档成功');
    expect(mockGetList).toHaveBeenCalledTimes(1);
  });
});
