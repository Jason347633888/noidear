<template>
  <view class="menu-item" @tap="handleTap">
    <text v-if="icon" class="menu-item__icon">{{ icon }}</text>
    <text class="menu-item__label">{{ title }}</text>
    <slot name="badge"></slot>
    <text v-if="arrow" class="menu-item__arrow">&gt;</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  arrow?: boolean
}>()

const emit = defineEmits<{
  (e: 'tap'): void
}>()

function handleTap(): void {
  emit('tap')
}
</script>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 24rpx;
  border-bottom: 2rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item__icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.menu-item__label {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-item__arrow {
  font-size: 28rpx;
  color: #ccc;
}
</style>
