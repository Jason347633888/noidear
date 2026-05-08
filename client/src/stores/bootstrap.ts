import { defineStore } from 'pinia';
import { getOrgBootstrapStatus } from '@/api/bootstrap';

export const useBootstrapStore = defineStore('bootstrap', {
  state: () => ({
    completed: true,
    step: 'completed' as string,
    reasons: [] as string[],
    loaded: false,
  }),
  actions: {
    async refresh() {
      const { data } = await getOrgBootstrapStatus();
      this.completed = data.completed;
      this.step = data.step;
      this.reasons = data.reasons;
      this.loaded = true;
      return data;
    },
  },
});
