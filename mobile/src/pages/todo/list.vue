<template>
  <view class="todo-page">
    <!-- Filter tabs -->
    <scroll-view scroll-x class="todo-page__filter">
      <view class="todo-page__filter-list">
        <view
          v-for="tab in filterTabs"
          :key="tab.value"
          class="todo-page__filter-item"
          :class="{ 'todo-page__filter-item--active': todoStore.currentFilter === tab.value }"
          @tap="todoStore.setFilter(tab.value)"
        >
          <text class="todo-page__filter-text">{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- Todo list -->
    <view class="todo-page__list">
      <TodoCard
        v-for="item in todoStore.todos"
        :key="item.id"
        :item="item"
        @tap="onTodoTap"
      />

      <EmptyState
        v-if="!todoStore.loading && todoStore.todos.length === 0"
        title="暂无待办任务"
        icon="&#x2705;"
      />

      <LoadingMore
        :loading="todoStore.loading"
        :has-more="todoStore.hasMore"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { useTodoStore } from '@/stores/todo'
import type { TodoFilter } from '@/stores/todo'
import type { TodoItem } from '@/types'
import TodoCard from '@/components/TodoCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingMore from '@/components/LoadingMore.vue'

const todoStore = useTodoStore()

const filterTabs: { label: string; value: TodoFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '培训', value: 'training_attend' },
  { label: '审批', value: 'approval' },
  { label: '设备', value: 'equipment_maintain' },
  { label: '整改', value: 'audit_rectification' },
]

onShow(() => {
  todoStore.fetchTodos(true)
})

onPullDownRefresh(async () => {
  await todoStore.fetchTodos(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  todoStore.fetchTodos()
})

function onTodoTap(item: TodoItem): void {
  uni.navigateTo({ url: `/pages/records/detail?id=${item.id}&type=todo` })
}
</script>

<style scoped>
.todo-page {
  padding-bottom: 20rpx;
}

.todo-page__filter {
  white-space: nowrap;
  background-color: #fff;
  padding: 20rpx;
}

.todo-page__filter-list {
  display: flex;
  gap: 16rpx;
}

.todo-page__filter-item {
  display: inline-flex;
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.todo-page__filter-item--active {
  background-color: #409eff;
}

.todo-page__filter-item--active .todo-page__filter-text {
  color: #fff;
}

.todo-page__filter-text {
  font-size: 26rpx;
  color: #666;
}

.todo-page__list {
  padding: 20rpx;
}
</style>
