<template>
  <el-time-picker
    :model-value="modelValue"
    @update:model-value="handleChange"
    is-range
    range-separator="至"
    start-placeholder="开始时间"
    end-placeholder="结束时间"
    :disabled="field.disabled || false"
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
