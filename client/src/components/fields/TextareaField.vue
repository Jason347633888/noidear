<template>
  <el-input
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
    @change="$emit('change', $event)"
    type="textarea"
    :rows="field.rows || 3"
    :placeholder="field.placeholder || `请输入${field.label}`"
    :disabled="field.disabled || false"
    :maxlength="field.maxlength"
    :show-word-limit="!!field.maxlength"
    clearable
  />
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
