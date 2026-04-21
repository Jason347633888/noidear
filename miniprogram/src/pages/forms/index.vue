<template>
  <view class="page">
    <view class="page-header">
      <text class="page-title">待填表单</text>
    </view>
    <view v-if="loading" class="loading-wrap">
      <text>加载中...</text>
    </view>
    <view v-else-if="tasks.length === 0" class="empty-wrap">
      <text>暂无待填表单</text>
    </view>
    <view v-else class="task-list">
      <view
        v-for="task in tasks"
        :key="task.id"
        class="task-card"
        @click="openForm(task)"
      >
        <text class="task-name">{{ task.templateName || task.name }}</text>
        <text class="task-due">截止：{{ task.dueDate || '无' }}</text>
        <text class="task-status" :class="task.status">{{ task.status }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { request } from '@/utils/request';

interface Task {
  id: string;
  name?: string;
  templateName?: string;
  dueDate?: string;
  status: string;
}

const loading = ref(false);
const tasks = ref<Task[]>([]);

async function fetchTasks() {
  loading.value = true;
  try {
    const res = await request<{ data: Task[] }>({ url: '/record-tasks/my' });
    tasks.value = res.data ?? [];
  } catch {
    tasks.value = [];
  } finally {
    loading.value = false;
  }
}

function openForm(task: Task) {
  uni.navigateTo({ url: `/pages/forms/fill?taskId=${task.id}` });
}

onMounted(fetchTasks);
</script>

<style scoped>
.page { padding: 24rpx; }
.page-header { margin-bottom: 24rpx; }
.page-title { font-size: 36rpx; font-weight: bold; color: #333; }
.loading-wrap, .empty-wrap { text-align: center; margin-top: 100rpx; color: #999; }
.task-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08);
}
.task-name { display: block; font-size: 30rpx; font-weight: 500; color: #333; margin-bottom: 12rpx; }
.task-due { display: block; font-size: 24rpx; color: #999; margin-bottom: 8rpx; }
.task-status { font-size: 24rpx; color: #07c160; }
</style>
