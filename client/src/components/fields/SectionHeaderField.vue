<template>
  <div class="section-header-field">
    <h4>{{ field.label }}</h4>
    <el-divider />
  </div>
</template>

<script setup lang="ts">
import type { FieldConfig } from './DynamicField.vue';

defineProps<{
  modelValue?: any;
  field: FieldConfig;
}>();
</script>

<style scoped>
.section-header-field {
  width: 100%;
}
.section-header-field h4 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
