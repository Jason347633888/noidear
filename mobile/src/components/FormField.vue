<template>
  <view class="form-field">
    <view class="form-field__label">
      <text v-if="field.required" class="form-field__required">*</text>
      <text class="form-field__label-text">{{ field.label }}</text>
    </view>

    <!-- text input -->
    <input
      v-if="field.type === 'text'"
      class="form-field__input"
      :value="modelValue as string"
      :placeholder="field.placeholder || '请输入'"
      :maxlength="field.maxLength || 200"
      @input="onInput"
    />

    <!-- number input -->
    <input
      v-else-if="field.type === 'number'"
      class="form-field__input"
      type="number"
      :value="String(modelValue || '')"
      :placeholder="field.placeholder || '请输入数字'"
      @input="onNumberInput"
    />

    <!-- textarea -->
    <textarea
      v-else-if="field.type === 'textarea'"
      class="form-field__textarea"
      :value="modelValue as string"
      :placeholder="field.placeholder || '请输入'"
      :maxlength="field.maxLength || 500"
      @input="onInput"
    />

    <!-- date picker -->
    <picker
      v-else-if="field.type === 'date'"
      mode="date"
      :value="(modelValue as string) || ''"
      @change="onPickerChange"
    >
      <view class="form-field__picker">
        <text :class="modelValue ? '' : 'form-field__placeholder'">
          {{ (modelValue as string) || field.placeholder || '请选择日期' }}
        </text>
      </view>
    </picker>

    <!-- time picker -->
    <picker
      v-else-if="field.type === 'time'"
      mode="time"
      :value="(modelValue as string) || ''"
      @change="onPickerChange"
    >
      <view class="form-field__picker">
        <text :class="modelValue ? '' : 'form-field__placeholder'">
          {{ (modelValue as string) || field.placeholder || '请选择时间' }}
        </text>
      </view>
    </picker>

    <!-- datetime picker -->
    <view v-else-if="field.type === 'datetime'" class="form-field__datetime">
      <picker
        mode="date"
        :value="datePart"
        @change="onDatetimeDateChange"
      >
        <view class="form-field__picker form-field__picker--half">
          <text :class="datePart ? '' : 'form-field__placeholder'">
            {{ datePart || '选择日期' }}
          </text>
        </view>
      </picker>
      <picker
        mode="time"
        :value="timePart"
        @change="onDatetimeTimeChange"
      >
        <view class="form-field__picker form-field__picker--half">
          <text :class="timePart ? '' : 'form-field__placeholder'">
            {{ timePart || '选择时间' }}
          </text>
        </view>
      </picker>
    </view>

    <!-- select -->
    <picker
      v-else-if="field.type === 'select'"
      :range="optionLabels"
      :value="selectedIndex"
      @change="onSelectChange"
    >
      <view class="form-field__picker">
        <text :class="modelValue !== undefined ? '' : 'form-field__placeholder'">
          {{ selectedLabel || field.placeholder || '请选择' }}
        </text>
      </view>
    </picker>

    <!-- multiselect -->
    <view v-else-if="field.type === 'multiselect'" class="form-field__multiselect">
      <view
        v-for="opt in field.options"
        :key="String(opt.value)"
        class="form-field__checkbox-item"
        @tap="toggleMultiSelect(opt.value)"
      >
        <view
          class="form-field__checkbox"
          :class="{ 'form-field__checkbox--checked': isMultiSelected(opt.value) }"
        >
          <text v-if="isMultiSelected(opt.value)" class="form-field__check-icon">&#x2713;</text>
        </view>
        <text class="form-field__checkbox-label">{{ opt.label }}</text>
      </view>
    </view>

    <!-- radio -->
    <view v-else-if="field.type === 'radio'" class="form-field__radio-group">
      <view
        v-for="opt in field.options"
        :key="String(opt.value)"
        class="form-field__radio-item"
        @tap="updateValue(opt.value)"
      >
        <view
          class="form-field__radio"
          :class="{ 'form-field__radio--checked': modelValue === opt.value }"
        >
          <view v-if="modelValue === opt.value" class="form-field__radio-dot"></view>
        </view>
        <text class="form-field__radio-label">{{ opt.label }}</text>
      </view>
    </view>

    <!-- checkbox (single boolean) -->
    <view
      v-else-if="field.type === 'checkbox'"
      class="form-field__checkbox-item"
      @tap="updateValue(!modelValue)"
    >
      <view
        class="form-field__checkbox"
        :class="{ 'form-field__checkbox--checked': !!modelValue }"
      >
        <text v-if="modelValue" class="form-field__check-icon">&#x2713;</text>
      </view>
      <text class="form-field__checkbox-label">{{ field.placeholder || '确认' }}</text>
    </view>

    <!-- image (camera) -->
    <Camera
      v-else-if="field.type === 'image'"
      :model-value="(modelValue as string[]) || []"
      @update:model-value="updateValue($event)"
    />

    <!-- signature -->
    <Signature
      v-else-if="field.type === 'signature'"
      :model-value="(modelValue as string) || ''"
      @update:model-value="updateValue($event)"
    />

    <!-- error message -->
    <text v-if="error" class="form-field__error">
      {{ error }}
    </text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormField } from '@/types'
import Camera from './Camera.vue'
import Signature from './Signature.vue'

const props = defineProps<{
  field: FormField
  modelValue: unknown
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

const optionLabels = computed(() => {
  return (props.field.options || []).map((o) => o.label)
})

const selectedIndex = computed(() => {
  const idx = (props.field.options || []).findIndex((o) => o.value === props.modelValue)
  return idx >= 0 ? idx : 0
})

const selectedLabel = computed(() => {
  const opt = (props.field.options || []).find((o) => o.value === props.modelValue)
  return opt ? opt.label : ''
})

const datePart = computed(() => {
  const val = props.modelValue as string
  if (!val) return ''
  return val.split(' ')[0] || ''
})

const timePart = computed(() => {
  const val = props.modelValue as string
  if (!val) return ''
  return val.split(' ')[1] || ''
})

function updateValue(value: unknown): void {
  emit('update:modelValue', value)
}

function onInput(event: { detail: { value: string } }): void {
  updateValue(event.detail.value)
}

function onNumberInput(event: { detail: { value: string } }): void {
  const num = parseFloat(event.detail.value)
  updateValue(isNaN(num) ? undefined : num)
}

function onPickerChange(event: { detail: { value: string } }): void {
  updateValue(event.detail.value)
}

function onSelectChange(event: { detail: { value: number } }): void {
  const index = event.detail.value
  if (props.field.options && props.field.options[index]) {
    updateValue(props.field.options[index].value)
  }
}

function toggleMultiSelect(value: string | number): void {
  const current = (props.modelValue as (string | number)[]) || []
  const idx = current.indexOf(value)
  if (idx >= 0) {
    updateValue(current.filter((_, i) => i !== idx))
  } else {
    updateValue([...current, value])
  }
}

function isMultiSelected(value: string | number): boolean {
  const current = (props.modelValue as (string | number)[]) || []
  return current.includes(value)
}

function onDatetimeDateChange(event: { detail: { value: string } }): void {
  const time = timePart.value || '00:00'
  updateValue(`${event.detail.value} ${time}`)
}

function onDatetimeTimeChange(event: { detail: { value: string } }): void {
  const date = datePart.value || new Date().toISOString().split('T')[0]
  updateValue(`${date} ${event.detail.value}`)
}
</script>

<style scoped>
.form-field {
  margin-bottom: 32rpx;
}

.form-field__label {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.form-field__required {
  color: #f56c6c;
  margin-right: 4rpx;
  font-size: 28rpx;
}

.form-field__label-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.form-field__input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-field__textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 16rpx 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-field__picker {
  height: 80rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.form-field__picker--half {
  flex: 1;
}

.form-field__datetime {
  display: flex;
  gap: 16rpx;
}

.form-field__placeholder {
  color: #c0c4cc;
}

.form-field__radio-group,
.form-field__multiselect {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.form-field__radio-item,
.form-field__checkbox-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 0;
}

.form-field__radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-field__radio--checked {
  border-color: #409eff;
}

.form-field__radio-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background-color: #409eff;
}

.form-field__checkbox {
  width: 36rpx;
  height: 36rpx;
  border-radius: 6rpx;
  border: 2rpx solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-field__checkbox--checked {
  background-color: #409eff;
  border-color: #409eff;
}

.form-field__check-icon {
  color: #fff;
  font-size: 24rpx;
}

.form-field__radio-label,
.form-field__checkbox-label {
  font-size: 28rpx;
  color: #333;
}

.form-field__error {
  font-size: 24rpx;
  color: #f56c6c;
  margin-top: 8rpx;
  display: block;
}
</style>
