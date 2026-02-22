<template>
  <view class="plan-card" @tap="$emit('tap', item)">
    <view class="plan-card__left">
      <view class="plan-card__dot" :style="{ backgroundColor: typeColor }"></view>
    </view>
    <view class="plan-card__content">
      <text class="plan-card__title">{{ item.title }}</text>
      <view class="plan-card__meta">
        <text class="plan-card__type">{{ typeLabel }}</text>
        <text class="plan-card__time">{{ item.time || '--:--' }}</text>
      </view>
    </view>
    <view class="plan-card__status" :style="{ color: statusColor }">
      <text class="plan-card__status-text">{{ statusLabel }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarPlan } from '@/types'

const props = defineProps<{
  item: CalendarPlan
}>()

defineEmits(['tap'])

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  maintenance: { label: '维保', color: '#409eff' },
  training: { label: '培训', color: '#e6a23c' },
  inspection: { label: '巡检', color: '#67c23a' },
  cleaning: { label: '清洁', color: '#909399' },
}

const typeLabel = computed(() => TYPE_MAP[props.item.type]?.label || '其他')
const typeColor = computed(() => TYPE_MAP[props.item.type]?.color || '#909399')

const statusLabel = computed(() => props.item.status === 'completed' ? '已完成' : '待完成')
const statusColor = computed(() => props.item.status === 'completed' ? '#67c23a' : '#e6a23c')
</script>

<style scoped>
.plan-card {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.plan-card__left {
  margin-right: 20rpx;
}

.plan-card__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.plan-card__content {
  flex: 1;
}

.plan-card__title {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.plan-card__meta {
  display: flex;
  gap: 16rpx;
}

.plan-card__type,
.plan-card__time {
  font-size: 22rpx;
  color: #999;
}

.plan-card__status-text {
  font-size: 24rpx;
}
</style>
