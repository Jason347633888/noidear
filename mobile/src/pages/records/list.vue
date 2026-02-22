<template>
  <view class="records-page">
    <!-- Search bar -->
    <view class="records-page__search">
      <input
        class="records-page__search-input"
        v-model="keyword"
        placeholder="搜索记录..."
        confirm-type="search"
        @confirm="onSearch"
      />
    </view>

    <!-- Filters -->
    <view class="records-page__filters">
      <picker :range="typeOptions" :value="typeIndex" @change="onTypeChange">
        <view class="records-page__filter-btn">
          <text class="records-page__filter-text">{{ typeOptions[typeIndex] }}</text>
        </view>
      </picker>
      <picker :range="statusOptions" :value="statusIndex" @change="onStatusChange">
        <view class="records-page__filter-btn">
          <text class="records-page__filter-text">{{ statusOptions[statusIndex] }}</text>
        </view>
      </picker>
      <picker :range="timeOptions" :value="timeIndex" @change="onTimeChange">
        <view class="records-page__filter-btn">
          <text class="records-page__filter-text">{{ timeOptions[timeIndex] }}</text>
        </view>
      </picker>
    </view>

    <!-- Record list -->
    <view class="records-page__list">
      <RecordCard
        v-for="item in records"
        :key="item.id"
        :item="item"
        @tap="onRecordTap"
      />

      <EmptyState
        v-if="!loading && records.length === 0"
        title="暂无记录"
        description="尝试更换筛选条件"
      />

      <LoadingMore :loading="loading" :has-more="hasMore" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import type { RecordItem, PaginatedResult } from '@/types'
import { get } from '@/utils/request'
import RecordCard from '@/components/RecordCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingMore from '@/components/LoadingMore.vue'

const records = ref<RecordItem[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const keyword = ref('')

const typeOptions = ['全部类型', '维保', '巡检', '清洁', '温控']
const typeIndex = ref(0)
const typeValues = ['', 'maintenance', 'inspection', 'cleaning', 'temperature']

const statusOptions = ['全部状态', '待审批', '已通过', '已驳回']
const statusIndex = ref(0)
const statusValues = ['', 'pending', 'approved', 'rejected']

const timeOptions = ['全部时间', '今天', '本周', '本月']
const timeIndex = ref(0)
const timeValues = ['', 'today', 'week', 'month']

async function fetchRecords(reset: boolean = false): Promise<void> {
  if (loading.value) return
  if (reset) {
    page.value = 1
    records.value = []
    hasMore.value = true
  }
  if (!hasMore.value) return

  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: page.value,
      pageSize: 10,
    }
    if (keyword.value) params.keyword = keyword.value
    if (typeValues[typeIndex.value]) params.type = typeValues[typeIndex.value]
    if (statusValues[statusIndex.value]) params.status = statusValues[statusIndex.value]
    if (timeValues[timeIndex.value]) params.timeRange = timeValues[timeIndex.value]

    const result = await get<PaginatedResult<RecordItem>>('/form-submissions', params)
    if (reset) {
      records.value = result.list
    } else {
      records.value = [...records.value, ...result.list]
    }
    hasMore.value = records.value.length < result.total
    page.value += 1
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function onSearch(): void {
  fetchRecords(true)
}

function onTypeChange(e: { detail: { value: number } }): void {
  typeIndex.value = e.detail.value
  fetchRecords(true)
}

function onStatusChange(e: { detail: { value: number } }): void {
  statusIndex.value = e.detail.value
  fetchRecords(true)
}

function onTimeChange(e: { detail: { value: number } }): void {
  timeIndex.value = e.detail.value
  fetchRecords(true)
}

function onRecordTap(item: RecordItem): void {
  uni.navigateTo({ url: `/pages/records/detail?id=${item.id}` })
}

onShow(() => {
  fetchRecords(true)
})

onPullDownRefresh(async () => {
  await fetchRecords(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  fetchRecords()
})
</script>

<style scoped>
.records-page {
  padding-bottom: 20rpx;
}

.records-page__search {
  padding: 20rpx;
  background-color: #fff;
}

.records-page__search-input {
  height: 72rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  font-size: 28rpx;
}

.records-page__filters {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background-color: #fff;
  border-top: 2rpx solid #f5f5f5;
}

.records-page__filter-btn {
  padding: 8rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.records-page__filter-text {
  font-size: 24rpx;
  color: #666;
}

.records-page__list {
  padding: 20rpx;
}
</style>
