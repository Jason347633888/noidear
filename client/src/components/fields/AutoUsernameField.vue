<template>
  <el-input :model-value="modelValue" disabled placeholder="自动填入当前用户名" />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue: string;
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const userStore = useUserStore();

onMounted(() => {
  if (!props.modelValue && userStore.user?.name) {
    emit('update:modelValue', userStore.user.name);
  }
});
</script>
