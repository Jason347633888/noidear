<template>
  <el-tag
    :type="tagType"
    size="small"
    :effect="effect"
    class="status-tag"
  >{{ label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type TagEffect = 'dark' | 'light' | 'plain';

const props = defineProps<{
  status: string;
  label?: string;
  effect?: TagEffect;
}>();

const STATUS_TYPE_MAP: Record<string, string> = {
  active: 'success',
  published: 'success',
  approved: 'success',
  completed: 'success',
  passed: 'success',
  effective: 'success',
  pending: 'warning',
  draft: 'info',
  reviewing: 'warning',
  in_progress: 'warning',
  open: 'warning',
  overdue: 'danger',
  rejected: 'danger',
  failed: 'danger',
  expired: 'danger',
  closed: 'info',
  archived: 'info',
  cancelled: 'info',
};

const tagType = computed(() => (STATUS_TYPE_MAP[props.status] ?? 'info') as 'success' | 'warning' | 'danger' | 'info' | '');
const effect = computed<TagEffect>(() => props.effect ?? 'light');
const label = computed(() => props.label ?? props.status);
</script>

<style scoped>
.status-tag {
  font-weight: 500;
  border-radius: 6px;
}
</style>
