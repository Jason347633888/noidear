<template>
  <el-input :model-value="displayValue" disabled />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue?: any;
  field: FieldConfig;
  allStepsData?: Record<number, Record<string, unknown>>;
}>();

const displayValue = computed(() => {
  const sourceStep = props.field.sourceStep as number | undefined;
  const sourceField = props.field.sourceField as string | undefined;
  if (!sourceStep || !sourceField || !props.allStepsData) return '';
  const stepData = props.allStepsData[sourceStep];
  if (!stepData) return '';
  const val = stepData[sourceField];
  return val !== undefined && val !== null ? String(val) : '';
});
</script>
