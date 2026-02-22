<template>
  <el-time-picker
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
    @change="$emit('change', $event)"
    :placeholder="field.placeholder || '选择时间'"
    :disabled="field.disabled || false"
    value-format="HH:mm:ss"
    :clearable="field.clearable !== false"
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
