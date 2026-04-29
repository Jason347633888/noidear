<template>
  <el-select
    :model-value="modelValue"
    filterable
    remote
    clearable
    reserve-keyword
    placeholder="选择生产批次"
    style="width: 100%"
    :remote-method="search"
    :loading="loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="batch in options"
      :key="batch.id"
      :label="`${batch.batchNumber} / ${batch.productName}`"
      :value="batch.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { productionBatchApi } from '@/api/batch';

defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const loading = ref(false);
const options = ref<any[]>([]);

async function search(keyword = '') {
  loading.value = true;
  try {
    const res = await productionBatchApi.getList({ page: 1, limit: 20, keyword });
    options.value = (res as any)?.list ?? (Array.isArray(res) ? res : []);
  } catch {
    options.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => search());
</script>
