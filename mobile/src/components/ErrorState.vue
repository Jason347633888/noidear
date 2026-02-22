<template>
  <view class="error-state">
    <view class="error-state__icon">
      <text class="error-state__icon-text">&#x26A0;</text>
    </view>
    <text class="error-state__title">{{ title }}</text>
    <text v-if="message" class="error-state__msg">{{ message }}</text>
    <view class="error-state__action" @tap="$emit('retry')">
      <text class="error-state__action-text">{{ retryText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: '加载失败',
  },
  message: {
    type: String,
    default: '请检查网络连接后重试',
  },
  retryText: {
    type: String,
    default: '重新加载',
  },
})

defineEmits(['retry'])
</script>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}

.error-state__icon {
  margin-bottom: 24rpx;
}

.error-state__icon-text {
  font-size: 80rpx;
}

.error-state__title {
  font-size: 30rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.error-state__msg {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin-bottom: 32rpx;
}

.error-state__action {
  padding: 16rpx 48rpx;
  background-color: #409eff;
  border-radius: 40rpx;
}

.error-state__action-text {
  color: #fff;
  font-size: 28rpx;
}
</style>
