<template>
  <view class="equip-page">
    <!-- Search -->
    <view class="equip-page__search">
      <input
        class="equip-page__search-input"
        v-model="keyword"
        placeholder="搜索设备编号/名称..."
        confirm-type="search"
        @confirm="onSearch"
      />
    </view>

    <!-- Status filter -->
    <scroll-view scroll-x class="equip-page__filter">
      <view class="equip-page__filter-list">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          class="equip-page__filter-item"
          :class="{ 'equip-page__filter-item--active': currentStatus === tab.value }"
          @tap="onStatusFilter(tab.value)"
        >
          <text class="equip-page__filter-text">{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- Equipment list -->
    <view class="equip-page__list">
      <EquipmentCard
        v-for="item in equipments"
        :key="item.id"
        :item="item"
        @tap="onEquipmentTap"
      />

      <EmptyState
        v-if="!loading && equipments.length === 0"
        title="暂无设备"
      />

      <LoadingMore :loading="loading" :has-more="hasMore" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import type { EquipmentItem, PaginatedResult } from '@/types'
import { get } from '@/utils/request'
import EquipmentCard from '@/components/EquipmentCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingMore from '@/components/LoadingMore.vue'

const equipments = ref<EquipmentItem[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const keyword = ref('')
const currentStatus = ref('')

const statusTabs = [
  { label: '全部', value: '' },
  { label: '正常', value: 'normal' },
  { label: '故障', value: 'fault' },
  { label: '维修中', value: 'maintenance' },
]

async function fetchEquipments(reset: boolean = false): Promise<void> {
  if (loading.value) return
  if (reset) {
    page.value = 1
    equipments.value = []
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
    if (currentStatus.value) params.status = currentStatus.value

    const result = await get<PaginatedResult<EquipmentItem>>('/equipment', params)
    if (reset) {
      equipments.value = result.list
    } else {
      equipments.value = [...equipments.value, ...result.list]
    }
    hasMore.value = equipments.value.length < result.total
    page.value += 1
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function onSearch(): void {
  fetchEquipments(true)
}

function onStatusFilter(status: string): void {
  currentStatus.value = status
  fetchEquipments(true)
}

function onEquipmentTap(item: EquipmentItem): void {
  uni.navigateTo({ url: `/pages/equipment/detail?id=${item.id}` })
}

onShow(() => {
  fetchEquipments(true)
})

onPullDownRefresh(async () => {
  await fetchEquipments(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  fetchEquipments()
})
</script>

<style scoped>
.equip-page {
  padding-bottom: 20rpx;
}

.equip-page__search {
  padding: 20rpx;
  background-color: #fff;
}

.equip-page__search-input {
  height: 72rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  font-size: 28rpx;
}

.equip-page__filter {
  white-space: nowrap;
  background-color: #fff;
  padding: 16rpx 20rpx;
  border-top: 2rpx solid #f5f5f5;
}

.equip-page__filter-list {
  display: flex;
  gap: 16rpx;
}

.equip-page__filter-item {
  display: inline-flex;
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.equip-page__filter-item--active {
  background-color: #409eff;
}

.equip-page__filter-item--active .equip-page__filter-text {
  color: #fff;
}

.equip-page__filter-text {
  font-size: 26rpx;
  color: #666;
}

.equip-page__list {
  padding: 20rpx;
}
</style>
