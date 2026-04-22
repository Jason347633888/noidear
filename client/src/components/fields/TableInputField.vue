<template>
  <div class="table-input-field">
    <el-table :data="rows" border size="small">
      <el-table-column
        v-for="col in field.columns"
        :key="col.key"
        :label="col.label"
        :prop="col.key"
      >
        <template #default="{ row, $index }">
          <template v-if="!col.readonly">
            <el-input
              v-model="row[col.key]"
              :class="{ 'cell-error': col.required && isCellMissing(row, col.key) }"
              size="small"
              @change="emitUpdate"
            />
            <div v-if="col.required && isCellMissing(row, col.key)" class="cell-error-text">
              {{ col.label }}不能为空
            </div>
          </template>
          <span v-else>{{ row[col.key] }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="!field.disabled" label="操作" width="80">
        <template #default="{ $index }">
          <el-button type="danger" size="small" text @click="removeRow($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button v-if="!field.disabled" type="primary" size="small" @click="addRow" style="margin-top:8px">
      添加行
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue: any[];
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void;
  (e: 'change', value: any[]): void;
}>();

const rows = ref<Record<string, any>[]>([]);
const isCellMissing = (row: Record<string, any>, key: string) => {
  const value = row[key];
  return value === undefined || value === null || String(value).trim() === '';
};

watch(
  () => props.modelValue,
  (val) => { rows.value = Array.isArray(val) ? val : []; },
  { immediate: true }
);

const addRow = () => {
  const newRow: Record<string, any> = {};
  (props.field.columns ?? []).forEach((col: any) => { newRow[col.key] = ''; });
  rows.value = [...rows.value, newRow];
  emitUpdate();
};

const removeRow = (index: number) => {
  rows.value = rows.value.filter((_, i) => i !== index);
  emitUpdate();
};

const emitUpdate = () => {
  const nextRows = [...rows.value];
  emit('update:modelValue', nextRows);
  emit('change', nextRows);
};
</script>

<style scoped>
.cell-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.cell-error-text {
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 18px;
  margin-top: 2px;
}
</style>
