<template>
  <el-select
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :placeholder="field.placeholder || `请选择${field.label}`"
    :disabled="field.disabled"
  >
    <el-option
      v-for="opt in rangeOptions"
      :key="opt"
      :label="String(opt)"
      :value="opt"
    />
  </el-select>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue: number | null;
  field: FieldConfig;
}>();

defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const rangeOptions = computed(() => {
  const min = props.field.min ?? 0;
  const max = props.field.max ?? 10;
  const step = props.field.step ?? 1;
  const opts: number[] = [];
  for (let i = min; i <= max; i += step) opts.push(i);
  return opts;
});
</script>
