import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach, defineComponent, h } from 'vitest';
import NoAccess from '../NoAccess.vue';
import { useModuleAccessStore } from '@/stores/moduleAccess';

const mockPush = vi.fn();
const mockBack = vi.fn();
let mockQuery: Record<string, string> = {};

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mockQuery }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

// ElResult stub that renders title prop as text + extra slot
const ElResultStub = {
  props: ['icon', 'title', 'subTitle'],
  template: '<div class="el-result-stub">{{ title }}<slot name="extra" /></div>',
};
// ElButton stub that forwards attrs + click
const ElButtonStub = {
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
};

const globalStubs = {
  ElResult: ElResultStub,
  ElButton: ElButtonStub,
};

describe('NoAccess', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockClear();
    mockBack.mockClear();
    mockQuery = {};
  });

  it('shows generic copy when no module param', () => {
    mockQuery = {};
    const w = mount(NoAccess, { global: { components: globalStubs } });
    expect(w.text()).toContain('当前角色无权访问');
  });

  it('shows module-specific copy when module query present', () => {
    mockQuery = { module: 'warehouse' };
    const w = mount(NoAccess, { global: { components: globalStubs } });
    expect(w.text()).toContain('仓库管理');
  });

  it('"back-home" button calls router.push', async () => {
    mockQuery = { module: 'warehouse' };
    const store = useModuleAccessStore();
    store.$patch({ roleCode: 'user', enabledModules: ['training'] });
    const w = mount(NoAccess, { global: { components: globalStubs } });
    await w.find('[data-test="back-home"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ path: expect.any(String) }));
  });
});
