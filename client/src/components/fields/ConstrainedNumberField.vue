<template>
  <el-input-number
    :model-value="modelValue"
    :min="field.min"
    :max="field.max"
    :step="field.step ?? 1"
    :placeholder="field.placeholder"
    :disabled="field.disabled"
    controls-position="right"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue: number | null;
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
  (
    e: 'validation-error',
    payload: {
      fieldKey: string;
      errorCode: string;
      message: string;
      severity: 'error';
    }
  ): void;
}>();

const handleChange = (val: number | null) => {
  if (val === null) return;
  const min = props.field.min;
  const max = props.field.max;
  if (typeof min === 'number' && val < min) {
    const message = `${props.field.label}不能小于${min}`;
    emit('validation-error', {
      fieldKey: props.field.name,
      errorCode: 'CONSTRAINED_NUMBER',
      message,
      severity: 'error',
    });
    return;
  }
  if (typeof max === 'number' && val > max) {
    const message = `${props.field.label}不能大于${max}`;
    emit('validation-error', {
      fieldKey: props.field.name,
      errorCode: 'CONSTRAINED_NUMBER',
      message,
      severity: 'error',
    });
    return;
  }
  emit('update:modelValue', val);
};
</script>
