<template>
  <view class="create-page">
    <!-- Template selector -->
    <view class="create-page__section">
      <text class="create-page__section-title">选择表单模板</text>

      <input
        v-model="keyword"
        class="create-page__search"
        placeholder="搜索编号、名称、部门或来源"
        confirm-type="search"
        @confirm="handleSearch"
      />

      <view v-if="templatesLoading" class="create-page__loading">
        <text class="create-page__loading-text">加载中...</text>
      </view>
      <view v-else-if="Object.keys(groupedTemplates).length === 0" class="create-page__empty">
        <text class="create-page__empty-text">暂无可用模板</text>
      </view>
      <view v-else class="create-page__template-list">
        <view
          v-for="(items, group) in groupedTemplates"
          :key="group"
          class="create-page__group"
        >
          <text class="create-page__group-title">{{ group }}</text>
          <view
            v-for="template in items"
            :key="template.id"
            class="create-page__template-item"
            :class="{ 'create-page__template-item--active': selectedTemplate?.id === template.id }"
            @tap="selectTemplate(template)"
          >
            <text class="create-page__template-name">{{ template.name }}</text>
            <text class="create-page__template-code">{{ template.code }}</text>
          </view>
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
import { computed, ref, onMounted } from 'vue'
import { fetchTemplates, submitRecord, type RecordTemplateItem } from '@/api/record'
import { buildStationSource } from '@/utils/stationContext'
import { sortTemplatesWithPinned } from '@/utils/recordTemplate'
import DynamicForm from '@/components/DynamicForm.vue'

const templates = ref<RecordTemplateItem[]>([])
const templatesLoading = ref(false)
const keyword = ref('')
const pinnedTemplateIds = ref<string[]>(uni.getStorageSync('station:pinnedTemplates') || [])
const selectedTemplate = ref<RecordTemplateItem | null>(null)
const formData = ref<Record<string, unknown>>({})
const submitting = ref(false)

const visibleTemplates = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  const filtered = text
    ? templates.value.filter((template) => {
        return [
          template.code,
          template.name,
          template.description,
          template.sourceGroup,
        ].some((value) => value.toLowerCase().includes(text))
      })
    : templates.value

  return sortTemplatesWithPinned(filtered, pinnedTemplateIds.value)
})

const groupedTemplates = computed(() => {
  return visibleTemplates.value.reduce<Record<string, RecordTemplateItem[]>>((groups, template) => {
    const group = template.sourceGroup
    groups[group] = groups[group] || []
    groups[group].push(template)
    return groups
  }, {})
})

onMounted(() => {
  loadTemplates()
})

async function loadTemplates(): Promise<void> {
  templatesLoading.value = true
  try {
    templates.value = await fetchTemplates(keyword.value)
  } catch {
    uni.showToast({ title: '加载模板失败', icon: 'none' })
  } finally {
    templatesLoading.value = false
  }
}

async function handleSearch(): Promise<void> {
  await loadTemplates()
}

function selectTemplate(template: RecordTemplateItem): void {
  selectedTemplate.value = template
  formData.value = {}
}

async function handleFormSubmit(data: Record<string, unknown>): Promise<void> {
  if (submitting.value || !selectedTemplate.value) return
  submitting.value = true

  try {
    await submitRecord(selectedTemplate.value.id, {
      ...data,
      _source: buildStationSource(null),
    })
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交失败'
    uni.showToast({ title: message, icon: 'none' })
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

.create-page__search {
  width: 100%;
  height: 72rpx;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
  margin-bottom: 20rpx;
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
  gap: 16rpx;
}

.create-page__group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.create-page__group-title {
  font-size: 24rpx;
  color: #666;
  font-weight: 600;
  padding: 8rpx 4rpx 4rpx;
  display: block;
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
