<template>
  <el-date-picker
    :model-value="modelValue"
    @update:model-value="handleChange"
    type="daterange"
    range-separator="至"
    start-placeholder="开始日期"
    end-placeholder="结束日期"
    :disabled="field.disabled || false"
    value-format="YYYY-MM-DD"
    style="width: 100%"
  />
</template>

<script setup lang="ts">
import type { FieldConfig } from './TextField.vue';

defineProps<{
  modelValue: [string, string] | null;
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: [string, string] | null): void;
  (e: 'blur'): void;
  (e: 'change', value: [string, string] | null): void;
}>();

const handleChange = (val: [string, string] | null) => {
  emit('update:modelValue', val);
  emit('change', val);
};
</script>
