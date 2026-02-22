<template>
  <el-cascader
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    :options="field.cascaderOptions || []"
    :placeholder="field.placeholder || `请选择${field.label}`"
    :disabled="field.disabled || false"
    clearable
    style="width: 100%"
  />
</template>

<script setup lang="ts">
import type { FieldConfig } from './TextField.vue';

defineProps<{
  modelValue: any;
  field: FieldConfig;
}>();

defineEmits<{
  (e: 'update:modelValue', value: any): void;
  (e: 'blur'): void;
  (e: 'change', value: any): void;
}>();
</script>
