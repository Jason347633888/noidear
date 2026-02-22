<template>
  <el-checkbox-group
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    :disabled="field.disabled || false"
  >
    <el-checkbox
      v-for="opt in field.options || []"
      :key="String(opt.value)"
      :label="opt.value"
    >
      {{ opt.label }}
    </el-checkbox>
  </el-checkbox-group>
</template>

<script setup lang="ts">
import type { FieldConfig } from './TextField.vue';

defineProps<{
  modelValue: any[];
  field: FieldConfig;
}>();

defineEmits<{
  (e: 'update:modelValue', value: any[]): void;
  (e: 'blur'): void;
  (e: 'change', value: any[]): void;
}>();
</script>
