<template>
  <view class="equip-detail">
    <view v-if="loading" class="page-loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="error">
      <ErrorState :message="error" @retry="fetchDetail" />
    </view>

    <view v-else-if="equipment" class="equip-detail__content">
      <!-- Basic info -->
      <view class="equip-detail__card">
        <view class="equip-detail__header">
          <text class="equip-detail__name">{{ equipment.name }}</text>
          <view class="equip-detail__status" :style="{ backgroundColor: statusColor }">
            <text class="equip-detail__status-text">{{ statusLabel }}</text>
          </view>
        </view>

        <view class="equip-detail__info-grid">
          <view class="equip-detail__info-item">
            <text class="equip-detail__info-label">设备编号</text>
            <text class="equip-detail__info-value">{{ equipment.code }}</text>
          </view>
          <view class="equip-detail__info-item">
            <text class="equip-detail__info-label">所在区域</text>
            <text class="equip-detail__info-value">{{ equipment.area }}</text>
          </view>
          <view class="equip-detail__info-item">
            <text class="equip-detail__info-label">设备型号</text>
            <text class="equip-detail__info-value">{{ equipment.model || '--' }}</text>
          </view>
          <view class="equip-detail__info-item">
            <text class="equip-detail__info-label">制造商</text>
            <text class="equip-detail__info-value">{{ equipment.manufacturer || '--' }}</text>
          </view>
          <view class="equip-detail__info-item">
            <text class="equip-detail__info-label">购买日期</text>
            <text class="equip-detail__info-value">{{ formatDate(equipment.purchaseDate) }}</text>
          </view>
          <view class="equip-detail__info-item">
            <text class="equip-detail__info-label">下次维护</text>
            <text class="equip-detail__info-value">{{ formatDate(equipment.nextMaintenanceDate) }}</text>
          </view>
        </view>
      </view>

      <!-- Maintenance records -->
      <view class="equip-detail__section">
        <text class="equip-detail__section-title">维护记录</text>
        <view v-if="equipment.maintenanceRecords && equipment.maintenanceRecords.length > 0">
          <view
            v-for="record in equipment.maintenanceRecords"
            :key="record.id"
            class="equip-detail__record"
          >
            <view class="equip-detail__record-header">
              <text class="equip-detail__record-type">{{ record.type }}</text>
              <text class="equip-detail__record-date">{{ formatDate(record.date) }}</text>
            </view>
            <text class="equip-detail__record-desc">{{ record.description }}</text>
            <text class="equip-detail__record-operator">操作人: {{ record.operator }}</text>
          </view>
        </view>
        <EmptyState v-else title="暂无维护记录" />
      </view>

      <!-- Maintenance plans -->
      <view class="equip-detail__section">
        <text class="equip-detail__section-title">维护计划</text>
        <view v-if="equipment.maintenancePlans && equipment.maintenancePlans.length > 0">
          <view
            v-for="plan in equipment.maintenancePlans"
            :key="plan.id"
            class="equip-detail__plan"
          >
            <text class="equip-detail__plan-title">{{ plan.title }}</text>
            <view class="equip-detail__plan-meta">
              <text class="equip-detail__plan-type">{{ plan.type }}</text>
              <text class="equip-detail__plan-date">{{ formatDate(plan.scheduledDate) }}</text>
              <text
                class="equip-detail__plan-status"
                :style="{ color: plan.status === 'completed' ? '#67c23a' : '#e6a23c' }"
              >
                {{ plan.status === 'completed' ? '已完成' : '待完成' }}
              </text>
            </view>
          </view>
        </view>
        <EmptyState v-else title="暂无维护计划" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import type { EquipmentDetail } from '@/types'
import { get } from '@/utils/request'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'

const equipment = ref<EquipmentDetail | null>(null)
const loading = ref(true)
const error = ref('')
let equipmentId = ''

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: '#67c23a' },
  fault: { label: '故障', color: '#f56c6c' },
  maintenance: { label: '维修中', color: '#e6a23c' },
}

const statusLabel = computed(() => {
  if (!equipment.value) return ''
  return STATUS_MAP[equipment.value.status]?.label || '未知'
})

const statusColor = computed(() => {
  if (!equipment.value) return '#909399'
  return STATUS_MAP[equipment.value.status]?.color || '#909399'
})

onLoad((options) => {
  equipmentId = options?.id || ''
  if (equipmentId) {
    fetchDetail()
  }
})

async function fetchDetail(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    equipment.value = await get<EquipmentDetail>(`/equipment/${equipmentId}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function formatDate(date: string): string {
  if (!date) return '--'
  return dayjs(date).format('YYYY-MM-DD')
}
</script>

<style scoped>
.equip-detail {
  padding: 20rpx;
}

.equip-detail__card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.equip-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.equip-detail__name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.equip-detail__status {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.equip-detail__status-text {
  font-size: 24rpx;
  color: #fff;
}

.equip-detail__info-grid {
  display: flex;
  flex-wrap: wrap;
}

.equip-detail__info-item {
  width: 50%;
  padding: 12rpx 0;
}

.equip-detail__info-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.equip-detail__info-value {
  font-size: 28rpx;
  color: #333;
}

.equip-detail__section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.equip-detail__section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.equip-detail__record {
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}

.equip-detail__record:last-child {
  border-bottom: none;
}

.equip-detail__record-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.equip-detail__record-type {
  font-size: 26rpx;
  color: #409eff;
}

.equip-detail__record-date {
  font-size: 22rpx;
  color: #999;
}

.equip-detail__record-desc {
  font-size: 26rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.equip-detail__record-operator {
  font-size: 22rpx;
  color: #999;
}

.equip-detail__plan {
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}

.equip-detail__plan:last-child {
  border-bottom: none;
}

.equip-detail__plan-title {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.equip-detail__plan-meta {
  display: flex;
  gap: 16rpx;
}

.equip-detail__plan-type,
.equip-detail__plan-date {
  font-size: 22rpx;
  color: #999;
}

.equip-detail__plan-status {
  font-size: 22rpx;
}
</style>
