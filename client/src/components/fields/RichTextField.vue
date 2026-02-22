<template>
  <div class="rich-text-field">
    <el-input
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      @blur="$emit('blur')"
      @change="$emit('change', $event)"
      :placeholder="field.placeholder || `请输入${field.label}`"
      :disabled="field.disabled || false"
      type="textarea"
      :rows="field.rows || 6"
      :maxlength="field.maxlength || 5000"
      show-word-limit
    />
    <div class="rich-text-hint">支持富文本内容</div>
  </div>
</template>

<script setup lang="ts">
import type { FieldConfig } from './TextField.vue';

defineProps<{
  modelValue: string;
  field: FieldConfig;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
  (e: 'change', value: string): void;
}>();
</script>

<style scoped>
.rich-text-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
