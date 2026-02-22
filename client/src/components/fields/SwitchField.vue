<template>
  <el-switch
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
    :disabled="field.disabled || false"
    :active-text="field.activeText"
    :inactive-text="field.inactiveText"
  />
</template>

<script setup lang="ts">
import type { FieldConfig } from './TextField.vue';

defineProps<{
  modelValue: boolean;
  field: FieldConfig;
}>();

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'blur'): void;
  (e: 'change', value: boolean): void;
}>();
</script>
