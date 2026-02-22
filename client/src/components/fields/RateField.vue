<template>
  <el-rate
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    :disabled="field.disabled || false"
    :max="field.max || 5"
    :allow-half="field.allowHalf || false"
    show-score
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
