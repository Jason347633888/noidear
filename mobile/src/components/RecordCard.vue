<template>
  <view class="record-card" @tap="$emit('tap', item)">
    <view class="record-card__header">
      <text class="record-card__type">{{ item.type }}</text>
      <view class="record-card__status" :style="{ backgroundColor: statusColor }">
        <text class="record-card__status-text">{{ statusLabel }}</text>
      </view>
    </view>
    <text class="record-card__title">{{ item.title }}</text>
    <view class="record-card__footer">
      <text class="record-card__submitter">{{ item.submitter }}</text>
      <text class="record-card__time">{{ formatTime }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { RecordItem } from '@/types'

const props = defineProps<{
  item: RecordItem
}>()

defineEmits(['tap'])

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: '#e6a23c' },
  approved: { label: '已通过', color: '#67c23a' },
  rejected: { label: '已驳回', color: '#f56c6c' },
}

const statusLabel = computed(() => STATUS_MAP[props.item.status]?.label || '未知')
const statusColor = computed(() => STATUS_MAP[props.item.status]?.color || '#909399')

const formatTime = computed(() => dayjs(props.item.submittedAt).format('MM-DD HH:mm'))
</script>

<style scoped>
.record-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.record-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.record-card__type {
  font-size: 22rpx;
  color: #999;
}

.record-card__status {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.record-card__status-text {
  font-size: 22rpx;
  color: #fff;
}

.record-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.record-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-card__submitter {
  font-size: 22rpx;
  color: #666;
}

.record-card__time {
  font-size: 22rpx;
  color: #999;
}
</style>
