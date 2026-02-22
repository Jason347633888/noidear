<template>
  <el-date-picker
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
    @change="$emit('change', $event)"
    type="date"
    :placeholder="field.placeholder || '选择日期'"
    :disabled="field.disabled || false"
    value-format="YYYY-MM-DD"
    :disabled-date="field.disabledDate"
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
