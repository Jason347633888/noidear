import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ModuleAccessManage from '../ModuleAccessManage.vue';

vi.mock('@/api/module-access', () => ({
  moduleAccessApi: {
    listMatrix: vi.fn().mockResolvedValue({
      modules: [{ moduleKey: 'warehouse', moduleLabel: '仓库管理', leader: true, user: true }],
    }),
    saveMatrix: vi.fn().mockResolvedValue({ modules: [] }),
  },
}));

vi.mock('@/stores/moduleAccess', () => ({
  useModuleAccessStore: () => ({ refresh: vi.fn() }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}));

const globalConfig = {
  stubs: {
    'el-table': {
      props: ['data'],
      template: '<div class="el-table"><div v-for="(row, i) in data" :key="i" class="row">{{ row.moduleLabel }}</div><slot /></div>',
    },
    'el-table-column': {
      props: ['prop', 'label'],
      template: '<div class="el-table-column">{{ label }}</div>',
    },
    'el-switch': { template: '<input type="checkbox" />' },
    'el-button': {
      template: '<button @click="$emit(\'click\')"><slot /></button>',
      emits: ['click'],
    },
  },
};

describe('ModuleAccessManage', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('loads and renders matrix', async () => {
    const w = mount(ModuleAccessManage, { global: globalConfig });
    await flushPromises();
    expect(w.text()).toContain('仓库管理');
  });
});
