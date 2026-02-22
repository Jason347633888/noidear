<template>
  <view class="equip-card" @tap="$emit('tap', item)">
    <view class="equip-card__header">
      <text class="equip-card__code">{{ item.code }}</text>
      <view class="equip-card__status" :style="{ backgroundColor: statusColor }">
        <text class="equip-card__status-text">{{ statusLabel }}</text>
      </view>
    </view>
    <text class="equip-card__name">{{ item.name }}</text>
    <view class="equip-card__footer">
      <text class="equip-card__area">{{ item.area }}</text>
      <text class="equip-card__date">上次维护: {{ formatDate }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { EquipmentItem } from '@/types'

const props = defineProps<{
  item: EquipmentItem
}>()

defineEmits(['tap'])

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: '#67c23a' },
  fault: { label: '故障', color: '#f56c6c' },
  maintenance: { label: '维修中', color: '#e6a23c' },
}

const statusLabel = computed(() => STATUS_MAP[props.item.status]?.label || '未知')
const statusColor = computed(() => STATUS_MAP[props.item.status]?.color || '#909399')

const formatDate = computed(() => {
  if (!props.item.lastMaintenanceDate) return '暂无'
  return dayjs(props.item.lastMaintenanceDate).format('YYYY-MM-DD')
})
</script>

<style scoped>
.equip-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.equip-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.equip-card__code {
  font-size: 22rpx;
  color: #999;
}

.equip-card__status {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.equip-card__status-text {
  font-size: 22rpx;
  color: #fff;
}

.equip-card__name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.equip-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.equip-card__area {
  font-size: 22rpx;
  color: #666;
}

.equip-card__date {
  font-size: 22rpx;
  color: #999;
}
</style>
