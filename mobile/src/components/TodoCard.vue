<template>
  <view class="todo-card" :class="{ 'todo-card--overdue': isOverdue }" @tap="$emit('tap', item)">
    <view class="todo-card__header">
      <view class="todo-card__type" :style="{ backgroundColor: typeColor }">
        <text class="todo-card__type-text">{{ typeLabel }}</text>
      </view>
      <text v-if="isOverdue" class="todo-card__overdue-tag">已逾期</text>
    </view>
    <view class="todo-card__body">
      <text class="todo-card__title">{{ item.title }}</text>
      <text class="todo-card__desc">{{ item.description }}</text>
    </view>
    <view class="todo-card__footer">
      <text class="todo-card__assignee">{{ item.assignee }}</text>
      <text class="todo-card__due" :class="{ 'todo-card__due--overdue': isOverdue }">
        {{ formatDueDate }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { TodoItem } from '@/types'

const props = defineProps<{
  item: TodoItem
}>()

defineEmits(['tap'])

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  training_attend: { label: '培训', color: '#409eff' },
  approval: { label: '审批', color: '#e6a23c' },
  equipment_maintain: { label: '设备', color: '#67c23a' },
  audit_rectification: { label: '整改', color: '#f56c6c' },
}

const typeLabel = computed(() => TYPE_MAP[props.item.type]?.label || '其他')
const typeColor = computed(() => TYPE_MAP[props.item.type]?.color || '#909399')

const isOverdue = computed(() => {
  if (props.item.status === 'completed') return false
  return dayjs(props.item.dueDate).isBefore(dayjs())
})

const formatDueDate = computed(() => {
  const due = dayjs(props.item.dueDate)
  if (due.isSame(dayjs(), 'day')) return '今天截止'
  if (due.isSame(dayjs().add(1, 'day'), 'day')) return '明天截止'
  return due.format('MM-DD') + ' 截止'
})
</script>

<style scoped>
.todo-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.todo-card--overdue {
  border-left: 6rpx solid #f56c6c;
}

.todo-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.todo-card__type {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.todo-card__type-text {
  font-size: 22rpx;
  color: #fff;
}

.todo-card__overdue-tag {
  font-size: 22rpx;
  color: #f56c6c;
  font-weight: bold;
}

.todo-card__body {
  margin-bottom: 16rpx;
}

.todo-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.todo-card__desc {
  font-size: 24rpx;
  color: #999;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.todo-card__assignee {
  font-size: 22rpx;
  color: #666;
}

.todo-card__due {
  font-size: 22rpx;
  color: #999;
}

.todo-card__due--overdue {
  color: #f56c6c;
  font-weight: bold;
}
</style>
