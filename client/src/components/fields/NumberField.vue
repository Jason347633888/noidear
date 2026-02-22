<template>
  <el-input-number
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
    @change="$emit('change', $event)"
    :placeholder="field.placeholder || `请输入${field.label}`"
    :disabled="field.disabled || false"
    :min="field.min"
    :max="field.max"
    :step="field.step || 1"
    :precision="field.precision"
    controls-position="right"
  />
</template>

<script setup lang="ts">
import type { FieldConfig } from './TextField.vue';

defineProps<{
  modelValue: number;
  field: FieldConfig;
}>();

defineEmits<{
  (e: 'update:modelValue', value: number): void;
  (e: 'blur'): void;
  (e: 'change', value: number): void;
}>();
</script>
