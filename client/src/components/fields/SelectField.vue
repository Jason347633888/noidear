<template>
  <el-select
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
    @change="$emit('change', $event)"
    :placeholder="field.placeholder || `请选择${field.label}`"
    :disabled="field.disabled || false"
    clearable
  >
    <el-option
      v-for="opt in field.options || []"
      :key="String(opt.value)"
      :label="opt.label"
      :value="opt.value"
    />
  </el-select>
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
