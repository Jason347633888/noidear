<template>
  <div class="static-content-field" v-html="renderedContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue?: any;
  field: FieldConfig;
}>();

// content comes from system configuration, not user input
const renderedContent = computed(() =>
  (props.field.content as string | undefined)?.replace(/\n/g, '<br>') ?? ''
);
</script>

<style scoped>
.static-content-field {
  width: 100%;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  font-size: 13px;
}
</style>
