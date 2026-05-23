import { defineStore } from 'pinia';
import { moduleAccessApi } from '@/api/module-access';

interface State {
  roleCode: 'admin' | 'leader' | 'user' | '';
  enabledModules: string[];
  loaded: boolean;
}

export const useModuleAccessStore = defineStore('moduleAccess', {
  state: (): State => ({ roleCode: '', enabledModules: [], loaded: false }),
  getters: {
    hasModule: (s) => (key: string) => s.roleCode === 'admin' || s.enabledModules.includes(key),
  },
  actions: {
    async refresh() {
      const me = await moduleAccessApi.me();
      this.roleCode = me.roleCode;
      this.enabledModules = me.enabledModules;
      this.loaded = true;
    },
    reset() {
      this.roleCode = '';
      this.enabledModules = [];
      this.loaded = false;
    },
  },
});
