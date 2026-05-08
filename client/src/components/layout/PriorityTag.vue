<template>
  <el-tag
    :type="tagType"
    size="small"
    effect="plain"
    class="priority-tag"
  >{{ displayLabel }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  priority: string;
  label?: string;
}>();

const PRIORITY_TYPE_MAP: Record<string, string> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
  none: 'info',
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  critical: '紧急',
  high: '高',
  medium: '中',
  low: '低',
  none: '无',
};

const tagType = computed(() => (PRIORITY_TYPE_MAP[props.priority] ?? 'info') as 'success' | 'warning' | 'danger' | 'info' | '');
const displayLabel = computed(() => props.label ?? PRIORITY_LABEL_MAP[props.priority] ?? props.priority);
</script>

<style scoped>
.priority-tag {
  font-weight: 500;
  border-radius: 6px;
}
</style>
