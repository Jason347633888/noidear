<template>
  <view class="dynamic-form">
    <FormField
      v-for="field in fields"
      :key="field.name"
      :field="field"
      :model-value="formData[field.name]"
      :error="errors[field.name]"
      @update:model-value="updateField(field.name, $event)"
    />

    <view v-if="!readonly" class="dynamic-form__actions">
      <view class="dynamic-form__btn dynamic-form__btn--primary" @tap="handleSubmit">
        <text class="dynamic-form__btn-text">提交</text>
      </view>
      <view class="dynamic-form__btn dynamic-form__btn--default" @tap="handleSaveDraft">
        <text class="dynamic-form__btn-text dynamic-form__btn-text--default">保存草稿</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted } from 'vue'
import type { FormField as FormFieldType } from '@/types'
import { validateField, validateForm } from '@/utils/validator'
import { saveDraft, getDraft, removeDraft } from '@/utils/storage'
import FormField from './FormField.vue'

const props = defineProps<{
  fields: FormFieldType[]
  formId: string
  initialData?: Record<string, unknown>
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: Record<string, unknown>): void
  (e: 'save-draft', data: Record<string, unknown>): void
}>()

const formData = reactive<Record<string, unknown>>({})
const errors = reactive<Record<string, string>>({})
let draftTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  initFormData()
  startDraftAutoSave()
})

onUnmounted(() => {
  stopDraftAutoSave()
})

function initFormData(): void {
  const draft = getDraft<Record<string, unknown>>(props.formId)

  for (const field of props.fields) {
    if (props.initialData && props.initialData[field.name] !== undefined) {
      formData[field.name] = props.initialData[field.name]
    } else if (draft && draft[field.name] !== undefined) {
      formData[field.name] = draft[field.name]
    } else if (field.defaultValue !== undefined) {
      formData[field.name] = field.defaultValue
    } else {
      formData[field.name] = field.type === 'multiselect' ? [] : undefined
    }
  }
}

function updateField(name: string, value: unknown): void {
  formData[name] = value
  if (errors[name]) {
    delete errors[name]
  }
  
  const field = props.fields.find((f) => f.name === name)
  if (field) {
    const error = validateField(field, value)
    if (error) {
      errors[name] = error
    }
  }
}

function startDraftAutoSave(): void {
  if (props.readonly) return
  draftTimer = setInterval(() => {
    saveDraft(props.formId, { ...formData })
  }, 30000)
}

function stopDraftAutoSave(): void {
  if (draftTimer) {
    clearInterval(draftTimer)
    draftTimer = null
  }
}

function handleSaveDraft(): void {
  saveDraft(props.formId, { ...formData })
  emit('save-draft', { ...formData })
  uni.showToast({ title: '草稿已保存', icon: 'success' })
}

function handleSubmit(): void {
  const validationErrors = validateForm(props.fields, formData)

  Object.keys(errors).forEach((k) => delete errors[k])
  for (const err of validationErrors) {
    errors[err.field] = err.message
  }

  if (validationErrors.length > 0) {
    uni.showToast({ title: validationErrors[0].message, icon: 'none' })
    return
  }

  removeDraft(props.formId)
  emit('submit', { ...formData })
}
</script>

<style scoped>
.dynamic-form {
  padding: 20rpx;
}

.dynamic-form__actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
  padding: 20rpx 0;
}

.dynamic-form__btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}

.dynamic-form__btn--primary {
  background-color: #409eff;
}

.dynamic-form__btn--default {
  background-color: #fff;
  border: 2rpx solid #dcdfe6;
}

.dynamic-form__btn-text {
  font-size: 30rpx;
  color: #fff;
}

.dynamic-form__btn-text--default {
  color: #606266;
}
</style>
