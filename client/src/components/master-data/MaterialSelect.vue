<template>
  <el-select
    :model-value="modelValue"
    filterable
    clearable
    placeholder="选择物料"
    style="width: 100%"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="item in materials"
      :key="item.id"
      :label="`${item.code ?? item.materialCode ?? ''} ${item.name}`"
      :value="item.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import request from '@/api/request';

defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const materials = ref<any[]>([]);

onMounted(async () => {
  try {
    const res = await request.get('/warehouse/materials', { params: { status: 'active', limit: 500 } });
    materials.value = (res as any)?.data ?? (res as any)?.list ?? (Array.isArray(res) ? res : []);
  } catch {
    materials.value = [];
  }
});
</script>
