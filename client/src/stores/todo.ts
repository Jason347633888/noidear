import { defineStore } from 'pinia';
import { ref } from 'vue';
import { todoApi } from '@/api/todo';

export const useTodoStore = defineStore('todo', () => {
  const pendingTodoCount = ref(0);
  let _inflight: Promise<void> | null = null;

  function handleStatsError(err: unknown): void {
    const code = (err as any)?.code;
    if (code !== 401 && code !== 403) {
      console.warn('[TodoStore] refreshPendingCount failed:', err);
    }
  }

  async function refreshPendingCount(): Promise<void> {
    if (_inflight) return _inflight;
    _inflight = todoApi
      .statistics()
      .then((stats) => { pendingTodoCount.value = stats.byStatus.pending; })
      .catch(handleStatsError)
      .finally(() => { _inflight = null; });
    return _inflight;
  }

  return { pendingTodoCount, refreshPendingCount };
});
