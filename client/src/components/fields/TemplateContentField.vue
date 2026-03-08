<template>
  <div class="template-content-field">{{ renderedContent }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue?: any;
  field: FieldConfig;
  currentStepData?: Record<string, unknown>;
}>();

const renderedContent = computed(() => {
  const template = (props.field.template as string | undefined) ?? '';
  const bindings = (props.field.bindings as Record<string, string> | undefined) ?? {};
  const data = props.currentStepData ?? {};

  return Object.entries(bindings).reduce((text, [placeholder, fieldKey]) => {
    const val = data[fieldKey] !== undefined && data[fieldKey] !== null ? String(data[fieldKey]) : '';
    return text.replaceAll(`{${placeholder}}`, val);
  }, template);
});
</script>

<style scoped>
.template-content-field {
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
