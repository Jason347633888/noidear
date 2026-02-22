<template>
  <el-input
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
    @change="$emit('change', $event)"
    :placeholder="field.placeholder || `请输入${field.label}`"
    :disabled="field.disabled || false"
    clearable
  />
</template>

<script setup lang="ts">
export interface FieldConfig {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: any }>;
  accept?: string;
  [key: string]: any;
}

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
