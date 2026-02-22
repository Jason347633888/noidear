<template>
  <el-color-picker
    :model-value="modelValue"
    @update:model-value="handleChange"
    :disabled="field.disabled || false"
    show-alpha
  />
</template>

<script setup lang="ts">
import type { FieldConfig } from './TextField.vue';

defineProps<{
  modelValue: string;
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
  (e: 'change', value: string): void;
}>();

const handleChange = (val: string | null) => {
  const value = val || '';
  emit('update:modelValue', value);
  emit('change', value);
};
</script>
