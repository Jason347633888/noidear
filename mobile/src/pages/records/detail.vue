<template>
  <view class="record-detail">
    <view v-if="loading" class="page-loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="error">
      <ErrorState :message="error" @retry="fetchDetail" />
    </view>

    <view v-else-if="record" class="record-detail__content">
      <!-- Record info -->
      <view class="record-detail__info">
        <text class="record-detail__title">{{ record.title }}</text>
        <view class="record-detail__meta">
          <text class="record-detail__meta-item">{{ record.type }}</text>
          <text class="record-detail__meta-item">{{ record.submitter }}</text>
          <text class="record-detail__meta-item">{{ formatDate(record.submittedAt) }}</text>
        </view>
        <view class="record-detail__status" :style="{ backgroundColor: statusColor }">
          <text class="record-detail__status-text">{{ statusLabel }}</text>
        </view>
      </view>

      <!-- Form data (readonly) -->
      <view v-if="formFields.length > 0" class="record-detail__form">
        <DynamicForm
          :fields="formFields"
          :form-id="record.id"
          :initial-data="record.data"
          :readonly="true"
        />
      </view>

      <!-- Raw data fallback -->
      <view v-else class="record-detail__raw">
        <view v-for="(value, key) in record.data" :key="key" class="record-detail__field">
          <text class="record-detail__field-label">{{ key }}</text>
          <text class="record-detail__field-value">{{ String(value) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import type { RecordItem, FormField } from '@/types'
import { get } from '@/utils/request'
import DynamicForm from '@/components/DynamicForm.vue'
import ErrorState from '@/components/ErrorState.vue'

const record = ref<RecordItem | null>(null)
const formFields = ref<FormField[]>([])
const loading = ref(true)
const error = ref('')
let recordId = ''

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: '#e6a23c' },
  approved: { label: '已通过', color: '#67c23a' },
  rejected: { label: '已驳回', color: '#f56c6c' },
}

const statusLabel = computed(() => {
  if (!record.value) return ''
  return STATUS_MAP[record.value.status]?.label || '未知'
})

const statusColor = computed(() => {
  if (!record.value) return '#909399'
  return STATUS_MAP[record.value.status]?.color || '#909399'
})

onLoad((options) => {
  recordId = options?.id || ''
  if (recordId) {
    fetchDetail()
  }
})

async function fetchDetail(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    record.value = await get<RecordItem>(`/form-submissions/${recordId}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.record-detail {
  padding: 20rpx;
}

.record-detail__info {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.record-detail__title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.record-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.record-detail__meta-item {
  font-size: 24rpx;
  color: #999;
}

.record-detail__status {
  display: inline-flex;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.record-detail__status-text {
  font-size: 24rpx;
  color: #fff;
}

.record-detail__form {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.record-detail__raw {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.record-detail__field {
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}

.record-detail__field:last-child {
  border-bottom: none;
}

.record-detail__field-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.record-detail__field-value {
  font-size: 28rpx;
  color: #333;
  display: block;
}
</style>
