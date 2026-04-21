<template>
  <view class="create-page">
    <!-- Offline banner -->
    <view v-if="!offlineStore.isOnline" class="create-page__offline-banner">
      <text class="create-page__offline-text">当前处于离线状态，提交后将自动同步</text>
    </view>

    <!-- Template selector -->
    <view class="create-page__section">
      <text class="create-page__section-title">选择表单模板</text>
      <view v-if="templatesLoading" class="create-page__loading">
        <text class="create-page__loading-text">加载中...</text>
      </view>
      <view v-else-if="templates.length === 0" class="create-page__empty">
        <text class="create-page__empty-text">暂无可用模板</text>
      </view>
      <view v-else class="create-page__template-list">
        <view
          v-for="tpl in templates"
          :key="tpl.id"
          class="create-page__template-item"
          :class="{ 'create-page__template-item--active': selectedTemplateId === tpl.id }"
          @tap="selectTemplate(tpl)"
        >
          <text class="create-page__template-name">{{ tpl.name }}</text>
          <text class="create-page__template-code">{{ tpl.code }}</text>
        </view>
      </view>
    </view>

    <!-- Dynamic form -->
    <view v-if="selectedTemplate" class="create-page__form-section">
      <DynamicForm
        :fields="selectedTemplate.fields"
        :form-id="selectedTemplate.id"
        :readonly="false"
        @submit="handleFormSubmit"
        @save-draft="handleSaveDraft"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOfflineStore } from '@/stores/offline'
import { fetchTemplates, submitRecord, type RecordTemplateItem } from '@/api/record'
import type { SyncQueueItem } from '@/types'
import DynamicForm from '@/components/DynamicForm.vue'
import { generateClientId } from '@/utils/sync'

const offlineStore = useOfflineStore()

const templates = ref<RecordTemplateItem[]>([])
const templatesLoading = ref(false)
const selectedTemplateId = ref<string | null>(null)
const selectedTemplate = ref<RecordTemplateItem | null>(null)
const submitting = ref(false)

onMounted(() => {
  offlineStore.initNetworkListener()
  loadTemplates()
})

async function loadTemplates(): Promise<void> {
  templatesLoading.value = true
  try {
    templates.value = await fetchTemplates()
  } catch {
    uni.showToast({ title: '加载模板失败', icon: 'none' })
  } finally {
    templatesLoading.value = false
  }
}

function selectTemplate(tpl: RecordTemplateItem): void {
  selectedTemplateId.value = tpl.id
  selectedTemplate.value = tpl
}

function saveOfflineAndNavigate(
  templateId: string,
  data: Record<string, unknown>,
  toastMsg: string,
): void {
  offlineStore.addToQueue({
    type: 'form_submission',
    data: { uuid: generateClientId(), formId: templateId, formData: data },
  } as Omit<SyncQueueItem, 'id' | 'retries' | 'maxRetries' | 'createdAt'>)
  uni.showToast({ title: toastMsg, icon: 'none', duration: 2500 })
  setTimeout(() => uni.navigateBack(), 2000)
}

async function handleOfflineSubmit(
  templateId: string,
  data: Record<string, unknown>,
): Promise<void> {
  saveOfflineAndNavigate(templateId, data, '已离线保存，联网后自动同步')
}

function promptOfflineFallback(
  templateId: string,
  data: Record<string, unknown>,
  errorMsg: string,
): void {
  uni.showModal({
    title: '提交失败',
    content: `${errorMsg}\n是否离线保存？`,
    confirmText: '离线保存',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        saveOfflineAndNavigate(templateId, data, '已离线保存')
      }
    },
  })
}

async function handleOnlineSubmit(
  templateId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await submitRecord(templateId, data)
  uni.showToast({ title: '提交成功', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 1500)
}

async function handleFormSubmit(data: Record<string, unknown>): Promise<void> {
  if (submitting.value || !selectedTemplate.value) return
  submitting.value = true
  const { id: templateId } = selectedTemplate.value

  try {
    if (!offlineStore.isOnline) {
      await handleOfflineSubmit(templateId, data)
      return
    }
    await handleOnlineSubmit(templateId, data)
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交失败'
    promptOfflineFallback(templateId, data, message)
  } finally {
    submitting.value = false
  }
}

function handleSaveDraft(_data: Record<string, unknown>): void {
  // Draft persistence is handled internally by DynamicForm component
}
</script>

<style scoped>
.create-page {
  padding-bottom: 40rpx;
}

.create-page__offline-banner {
  background-color: #e6a23c;
  padding: 16rpx 24rpx;
}

.create-page__offline-text {
  font-size: 24rpx;
  color: #fff;
}

.create-page__section {
  padding: 24rpx 20rpx 0;
}

.create-page__section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.create-page__loading,
.create-page__empty {
  padding: 32rpx;
  text-align: center;
}

.create-page__loading-text,
.create-page__empty-text {
  font-size: 26rpx;
  color: #999;
}

.create-page__template-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.create-page__template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 12rpx;
  border: 2rpx solid #dcdfe6;
}

.create-page__template-item--active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.create-page__template-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.create-page__template-code {
  font-size: 22rpx;
  color: #999;
}

.create-page__form-section {
  margin-top: 24rpx;
  background-color: #fff;
  border-radius: 16rpx;
  margin-left: 20rpx;
  margin-right: 20rpx;
  overflow: hidden;
}
</style>
