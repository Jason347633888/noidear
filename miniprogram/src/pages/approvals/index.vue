<template>
  <view class="page">
    <view class="page-header">
      <text class="page-title">待审批</text>
    </view>
    <view v-if="loading" class="loading-wrap"><text>加载中...</text></view>
    <view v-else-if="approvals.length === 0" class="empty-wrap"><text>暂无待审批项</text></view>
    <view v-else class="approval-list">
      <view
        v-for="item in approvals"
        :key="item.id"
        class="approval-card"
        @click="openApproval(item)"
      >
        <text class="approval-title">{{ item.title || item.type }}</text>
        <text class="approval-time">{{ item.createdAt }}</text>
        <view class="btn-row">
          <button class="btn-approve" size="mini" @click.stop="approve(item.id)">通过</button>
          <button class="btn-reject" size="mini" @click.stop="reject(item.id)">驳回</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { request } from '@/utils/request';

interface Approval {
  id: string;
  title?: string;
  type?: string;
  createdAt?: string;
}

const loading = ref(false);
const approvals = ref<Approval[]>([]);

async function fetchApprovals() {
  loading.value = true;
  try {
    const res = await request<{ data: Approval[] }>({ url: '/approvals/pending' });
    approvals.value = res.data ?? [];
  } catch {
    approvals.value = [];
  } finally {
    loading.value = false;
  }
}

async function approve(id: string) {
  await request({ url: `/approvals/${id}/approve`, method: 'POST' });
  fetchApprovals();
}

async function reject(id: string) {
  await request({ url: `/approvals/${id}/reject`, method: 'POST' });
  fetchApprovals();
}

function openApproval(item: Approval) {
  uni.navigateTo({ url: `/pages/approvals/detail?id=${item.id}` });
}

onMounted(fetchApprovals);
</script>

<style scoped>
.page { padding: 24rpx; }
.page-header { margin-bottom: 24rpx; }
.page-title { font-size: 36rpx; font-weight: bold; color: #333; }
.loading-wrap, .empty-wrap { text-align: center; margin-top: 100rpx; color: #999; }
.approval-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08);
}
.approval-title { display: block; font-size: 30rpx; font-weight: 500; color: #333; margin-bottom: 8rpx; }
.approval-time { display: block; font-size: 24rpx; color: #999; margin-bottom: 16rpx; }
.btn-row { display: flex; gap: 16rpx; }
.btn-approve { background: #07c160 !important; color: white !important; }
.btn-reject { background: #e74c3c !important; color: white !important; }
</style>
