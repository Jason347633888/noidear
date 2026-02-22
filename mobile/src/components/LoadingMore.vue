<template>
  <view class="loading-more">
    <view v-if="loading" class="loading-more__spinner">
      <view class="loading-more__dot"></view>
      <text class="loading-more__text">{{ loadingText }}</text>
    </view>
    <view v-else-if="!hasMore" class="loading-more__end">
      <text class="loading-more__text">{{ noMoreText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  hasMore: {
    type: Boolean,
    default: true,
  },
  loadingText: {
    type: String,
    default: '加载中...',
  },
  noMoreText: {
    type: String,
    default: '没有更多了',
  },
})
</script>

<style scoped>
.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx 0;
}

.loading-more__spinner {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.loading-more__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  border: 3rpx solid #409eff;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-more__end {
  display: flex;
  align-items: center;
}

.loading-more__text {
  font-size: 24rpx;
  color: #999;
}
</style>
