import { defineStore } from 'pinia';
import { getOrgBootstrapStatus } from '@/api/bootstrap';

interface BootstrapStatus {
  completed: boolean;
  step: string;
  reasons: string[];
}

export const useBootstrapStore = defineStore('bootstrap', {
  state: () => ({
    completed: false,
    step: '' as string,
    reasons: [] as string[],
    loaded: false,
  }),
  actions: {
    async refresh() {
      const status = await getOrgBootstrapStatus() as BootstrapStatus;
      this.completed = status.completed;
      this.step = status.step;
      this.reasons = status.reasons;
      this.loaded = true;
      return status;
    },
  },
});
