import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TodoItem, PaginatedResult } from '@/types'
import { get } from '@/utils/request'

export type TodoFilter = 'all' | 'training_attend' | 'approval' | 'equipment_maintain' | 'audit_rectification'

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<TodoItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const loading = ref(false)
  const hasMore = ref(true)
  const currentFilter = ref<TodoFilter>('all')

  const overdueTodos = computed(() =>
    todos.value.filter((t) => {
      const now = new Date()
      const due = new Date(t.dueDate)
      return due < now && t.status !== 'completed'
    }),
  )

  const pendingCount = computed(() =>
    todos.value.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
  )

  async function fetchTodos(reset: boolean = false): Promise<void> {
    if (loading.value) return

    if (reset) {
      page.value = 1
      todos.value = []
      hasMore.value = true
    }

    if (!hasMore.value) return

    loading.value = true
    try {
      const params: Record<string, unknown> = {
        page: page.value,
        pageSize: pageSize.value,
      }
      if (currentFilter.value !== 'all') {
        params.type = currentFilter.value
      }
      const result = await get<PaginatedResult<TodoItem>>('/todos', params)
      if (reset) {
        todos.value = result.list
      } else {
        todos.value = [...todos.value, ...result.list]
      }
      total.value = result.total
      hasMore.value = todos.value.length < result.total
      page.value += 1
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  function setFilter(filter: TodoFilter): void {
    currentFilter.value = filter
    fetchTodos(true)
  }

  async function fetchRecentTodos(limit: number = 5): Promise<TodoItem[]> {
    try {
      const result = await get<PaginatedResult<TodoItem>>('/todos', {
        page: 1,
        pageSize: limit,
      })
      return result.list
    } catch {
      return []
    }
  }

  function reset(): void {
    todos.value = []
    total.value = 0
    page.value = 1
    hasMore.value = true
    currentFilter.value = 'all'
  }

  return {
    todos,
    total,
    page,
    loading,
    hasMore,
    currentFilter,
    overdueTodos,
    pendingCount,
    fetchTodos,
    setFilter,
    fetchRecentTodos,
    reset,
  }
})
