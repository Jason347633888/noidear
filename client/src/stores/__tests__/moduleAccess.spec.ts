import { setActivePinia, createPinia } from 'pinia';
import { useModuleAccessStore } from '../moduleAccess';

vi.mock('@/api/module-access', () => ({
  moduleAccessApi: { me: vi.fn().mockResolvedValue({ roleCode: 'user', enabledModules: ['warehouse'] }) },
}));

describe('moduleAccessStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('refresh() loads enabledModules', async () => {
    const store = useModuleAccessStore();
    await store.refresh();
    expect(store.enabledModules).toEqual(['warehouse']);
  });

  it('hasModule(key) returns true for admin regardless of array', () => {
    const store = useModuleAccessStore();
    store.$patch({ roleCode: 'admin', enabledModules: [] });
    expect(store.hasModule('warehouse')).toBe(true);
  });

  it('hasModule(key) honors enabledModules for non-admin', () => {
    const store = useModuleAccessStore();
    store.$patch({ roleCode: 'user', enabledModules: ['warehouse'] });
    expect(store.hasModule('warehouse')).toBe(true);
    expect(store.hasModule('training')).toBe(false);
  });
});
