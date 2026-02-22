<template>
  <view class="empty-state">
    <view class="empty-state__icon">
      <text class="empty-state__icon-text">{{ icon }}</text>
    </view>
    <text class="empty-state__title">{{ title }}</text>
    <text v-if="description" class="empty-state__desc">{{ description }}</text>
    <view v-if="actionText" class="empty-state__action" @tap="$emit('action')">
      <text class="empty-state__action-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    default: '📭',
  },
  title: {
    type: String,
    default: '暂无数据',
  },
  description: {
    type: String,
    default: '',
  },
  actionText: {
    type: String,
    default: '',
  },
})

defineEmits(['action'])
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}

.empty-state__icon {
  margin-bottom: 24rpx;
}

.empty-state__icon-text {
  font-size: 80rpx;
}

.empty-state__title {
  font-size: 30rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.empty-state__desc {
  font-size: 24rpx;
  color: #ccc;
  text-align: center;
  margin-bottom: 32rpx;
}

.empty-state__action {
  padding: 16rpx 48rpx;
  background-color: #409eff;
  border-radius: 40rpx;
}

.empty-state__action-text {
  color: #fff;
  font-size: 28rpx;
}
</style>
