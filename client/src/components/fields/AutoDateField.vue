<template>
  <el-input :model-value="modelValue" disabled placeholder="自动填入当前日期" />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import dayjs from 'dayjs';
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue: string;
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

onMounted(() => {
  if (!props.modelValue) {
    emit('update:modelValue', dayjs().format('YYYY-MM-DD'));
  }
});
</script>
