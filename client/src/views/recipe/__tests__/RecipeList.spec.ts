import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockRecipeGetList = vi.fn();
const mockRecipeArchive = vi.fn();
const mockProductGetList = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('@/api/recipe', () => ({
  recipeApi: {
    getList: (...args: unknown[]) => mockRecipeGetList(...args),
    archive: (...args: unknown[]) => mockRecipeArchive(...args),
  },
  getRecipeStatusText: (status: string) => (status === 'active' ? '当前版本' : '已归档'),
  getRecipeStatusType: (status: string) => (status === 'active' ? 'success' : 'info'),
}));

vi.mock('@/api/product', () => ({
  productApi: {
    getList: (...args: unknown[]) => mockProductGetList(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}));

const stubs: Record<string, any> = {
  'el-card': { template: '<div><slot name="header" /><slot /></div>' },
  'el-radio-group': {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<div><slot /></div>',
  },
  'el-radio-button': { props: ['label'], template: '<button><slot /></button>' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option />' },
  'el-table': {
    props: ['data'],
    template: '<div><slot v-for="row in data" :row="row" /></div>',
  },
  'el-table-column': {
    props: ['label'],
    template: '<div><slot :row="{ id: \'recipe-1\', product_id: \'prod-1\', version: 1, status: \'archived\', version_note: \'旧版\', lines: [], product: { id: \'prod-1\', name: \'产品A\', code: \'P-001\', status: \'active\', deleted_at: \'2026-04-29T08:00:00.000Z\' } }" /></div>',
  },
  'el-tag': { template: '<span><slot /></span>' },
  'el-button': { props: ['type', 'link'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
};

import RecipeList from '../RecipeList.vue';

const activeRecipe = {
  id: 'recipe-1',
  product_id: 'prod-1',
  version: 1,
  status: 'active',
  version_note: '当前',
  lines: [],
  product: { id: 'prod-1', name: '产品A', code: 'P-001', status: 'active', deleted_at: null },
};

const archivedByProductRecipe = {
  id: 'recipe-2',
  product_id: 'prod-1',
  version: 2,
  status: 'archived',
  version_note: '归档',
  lines: [],
  product: { id: 'prod-1', name: '产品A', code: 'P-001', status: 'active', deleted_at: '2026-04-29T08:00:00.000Z' },
};

describe('RecipeList archive views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecipeGetList.mockResolvedValue([activeRecipe]);
    mockProductGetList.mockResolvedValue([{ id: 'prod-1', name: '产品A', code: 'P-001', status: 'active' }]);
  });

  it('loads active recipes by default', async () => {
    mount(RecipeList, { global: { stubs } });
    await flushPromises();

    expect(mockRecipeGetList).toHaveBeenCalledWith(false);
  });

  it('loads archived recipes when archive view is selected', async () => {
    mockRecipeGetList.mockResolvedValue([archivedByProductRecipe]);
    const wrapper = mount(RecipeList, { global: { stubs } });
    await flushPromises();

    (wrapper.vm as any).viewMode = 'archive';
    await (wrapper.vm as any).loadList();
    await flushPromises();

    expect(mockRecipeGetList).toHaveBeenLastCalledWith(true);
    expect(wrapper.text()).toContain('归档配方');
    expect(wrapper.text()).toContain('产品已归档');
    expect(wrapper.text()).toContain('仅查看');
  });

  it('archives active recipe and reloads current view', async () => {
    const { ElMessageBox, ElMessage } = await import('element-plus');
    (ElMessageBox.confirm as any).mockResolvedValue(true);
    mockRecipeArchive.mockResolvedValue({ id: 'recipe-1', status: 'archived' });
    const wrapper = mount(RecipeList, { global: { stubs } });
    await flushPromises();
    mockRecipeGetList.mockClear();

    await (wrapper.vm as any).handleArchive(activeRecipe);
    await flushPromises();

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '确定要归档「产品A」v1 的配方吗？归档后不会出现在可用配方列表中。',
      '归档确认',
      { confirmButtonText: '确定归档', cancelButtonText: '取消', type: 'warning' },
    );
    expect(mockRecipeArchive).toHaveBeenCalledWith('recipe-1');
    expect(ElMessage.success).toHaveBeenCalledWith('归档成功');
    expect(mockRecipeGetList).toHaveBeenCalledWith(false);
  });
});
