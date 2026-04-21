<template>
  <view class="page">
    <view class="page-header">
      <text class="page-title">数据看板</text>
      <text class="page-subtitle">{{ currentMonth }} 月汇总</text>
    </view>
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-value">{{ stats.todayOutput ?? '--' }}</text>
        <text class="stat-label">今日产量</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.pendingTasks ?? '--' }}</text>
        <text class="stat-label">待填表单</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.pendingApprovals ?? '--' }}</text>
        <text class="stat-label">待审批</text>
      </view>
      <view class="stat-card">
        <text class="stat-value" :class="{ warn: (stats.ncCount ?? 0) > 0 }">{{ stats.ncCount ?? '--' }}</text>
        <text class="stat-label">本月不合格品</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { request } from '@/utils/request';

interface Stats {
  todayOutput?: number;
  pendingTasks?: number;
  pendingApprovals?: number;
  ncCount?: number;
}

const stats = ref<Stats>({});
const currentMonth = new Date().getMonth() + 1;

async function fetchStats() {
  try {
    const res = await request<{ data: Stats }>({ url: '/statistics/summary' });
    stats.value = res.data ?? {};
  } catch {
    stats.value = {};
  }
}

onMounted(fetchStats);
</script>

<style scoped>
.page { padding: 24rpx; }
.page-header { margin-bottom: 32rpx; }
.page-title { display: block; font-size: 36rpx; font-weight: bold; color: #333; }
.page-subtitle { display: block; font-size: 26rpx; color: #999; margin-top: 6rpx; }
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.stat-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 36rpx 24rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08);
}
.stat-value { display: block; font-size: 56rpx; font-weight: bold; color: #1890ff; margin-bottom: 12rpx; }
.stat-value.warn { color: #e74c3c; }
.stat-label { display: block; font-size: 24rpx; color: #666; }
</style>
