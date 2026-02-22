import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SyncQueueItem } from '@/types'
import { getSyncQueue, setSyncQueue, clearSyncQueue } from '@/utils/storage'
import { post } from '@/utils/request'

export const useOfflineStore = defineStore('offline', () => {
  const queue = ref<SyncQueueItem[]>([])
  const isSyncing = ref(false)
  const isOnline = ref(true)
  const lastSyncTime = ref<string | null>(null)

  const pendingCount = computed(() => queue.value.length)

  const failedItems = computed(() =>
    queue.value.filter((item) => item.retries >= item.maxRetries),
  )

  function loadQueue(): void {
    queue.value = getSyncQueue<SyncQueueItem>()
  }

  function saveQueue(): void {
    setSyncQueue(queue.value)
  }

  function addToQueue(item: Omit<SyncQueueItem, 'id' | 'retries' | 'maxRetries' | 'createdAt'>): void {
    const newItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      retries: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    }
    queue.value = [...queue.value, newItem]
    saveQueue()
  }

  function removeFromQueue(id: string): void {
    queue.value = queue.value.filter((item) => item.id !== id)
    saveQueue()
  }

  async function syncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      await post('/mobile/sync', {
        submissions: [{ clientId: item.id, ...item.data }],
      })
      return true
    } catch {
      return false
    }
  }

  async function syncAll(): Promise<void> {
    if (isSyncing.value || !isOnline.value) return
    if (queue.value.length === 0) return

    isSyncing.value = true
    const processable = queue.value.filter((item) => item.retries < item.maxRetries)

    for (const item of processable) {
      const success = await syncItem(item)
      if (success) {
        removeFromQueue(item.id)
      } else {
        queue.value = queue.value.map((q) =>
          q.id === item.id
            ? { ...q, retries: q.retries + 1, lastAttempt: new Date().toISOString() }
            : q,
        )
      }
    }

    saveQueue()
    lastSyncTime.value = new Date().toISOString()
    isSyncing.value = false
  }

  function clearFailed(): void {
    queue.value = queue.value.filter((item) => item.retries < item.maxRetries)
    saveQueue()
  }

  function clearAllQueue(): void {
    queue.value = []
    clearSyncQueue()
  }

  function initNetworkListener(): void {
    loadQueue()

    uni.getNetworkType({
      success: (res) => {
        isOnline.value = res.networkType !== 'none'
      },
    })

    uni.onNetworkStatusChange((res) => {
      isOnline.value = res.isConnected
      if (res.isConnected && queue.value.length > 0) {
        syncAll()
      }
    })
  }

  function checkNetworkAndSync(): void {
    uni.getNetworkType({
      success: (res) => {
        isOnline.value = res.networkType !== 'none'
        if (isOnline.value && queue.value.length > 0) {
          syncAll()
        }
      },
    })
  }

  return {
    queue,
    isSyncing,
    isOnline,
    lastSyncTime,
    pendingCount,
    failedItems,
    loadQueue,
    addToQueue,
    removeFromQueue,
    syncAll,
    clearFailed,
    clearAllQueue,
    initNetworkListener,
    checkNetworkAndSync,
  }
})
