import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SystemDocumentCenter from '../SystemDocumentCenter.vue';

describe('SystemDocumentCenter', () => {
  it('shows library and ledger views under one center', () => {
    const wrapper = mount(SystemDocumentCenter, {
      global: {
        stubs: {
          'el-tabs': { template: '<div><slot /></div>' },
          'el-tab-pane': { template: '<section><slot /></section>', props: ['label', 'name'] },
          SystemFileLibrary: { template: '<div class="library-view" />' },
          Level1List: { template: '<div class="ledger-view" />' },
        },
      },
    });

    expect(wrapper.find('.library-view').exists()).toBe(true);
    expect(wrapper.find('.ledger-view').exists()).toBe(true);
  });
});
