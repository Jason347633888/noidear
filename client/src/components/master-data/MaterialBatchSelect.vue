<template>
  <el-select
    :model-value="modelValue"
    filterable
    remote
    clearable
    reserve-keyword
    :disabled="disabled || !materialId"
    placeholder="选择物料批次"
    style="width: 100%"
    :remote-method="search"
    :loading="loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="batch in options"
      :key="batch.id"
      :label="formatLabel(batch)"
      :value="batch.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { materialBatchApi, type MaterialBatchOption } from '@/api/batch';

const props = defineProps<{
  modelValue?: string;
  materialId?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const loading = ref(false);
const options = ref<MaterialBatchOption[]>([]);

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

function formatLabel(batch: MaterialBatchOption) {
  const materialName = batch.material?.name ?? '未知物料';
  const supplierName = batch.supplier?.name ?? '未知供应商';
  return `${batch.batchNumber} / ${materialName} / ${supplierName} / 剩余 ${batch.quantity} / 有效期 ${formatDate(batch.expiryDate)}`;
}

async function search(keyword = '') {
  if (!props.materialId) {
    options.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await materialBatchApi.getList({
      materialId: props.materialId,
      keyword,
      limit: 20,
    });
    options.value = Array.isArray(res) ? res : [];
  } catch {
    options.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.materialId,
  async (materialId, previousMaterialId) => {
    if (materialId !== previousMaterialId) {
      emit('update:modelValue', '');
    }
    await search();
  },
);

onMounted(() => search());
</script>
