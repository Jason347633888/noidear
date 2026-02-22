<template>
  <el-slider
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    :disabled="field.disabled || false"
    :min="field.min || 0"
    :max="field.max || 100"
    :step="field.step || 1"
    show-input
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
