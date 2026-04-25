<template>
  <div class="table-input-field">
    <el-table :data="rows" border size="small">
      <el-table-column
        v-for="col in field.columns"
        :key="col.key"
        :label="col.label"
        :prop="col.key"
      >
        <template #default="{ row }">
          <template v-if="!col.readonly">
            <el-input
              v-model="row[col.key]"
              :class="{ 'cell-error': shouldShowCellError(row, col.key, col.required) }"
              size="small"
              @change="handleCellChange(row, col.key)"
            />
            <div v-if="shouldShowCellError(row, col.key, col.required)" class="cell-error-text">
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
import { nextTick, ref, watch } from 'vue';
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
const touchedCells = ref<Set<string>>(new Set());
let isEmitting = false;

const isCellMissing = (row: Record<string, any>, key: string) => {
  const value = row[key];
  return value === undefined || value === null || String(value).trim() === '';
};

const getCellId = (row: Record<string, any>, key: string) => `${rows.value.indexOf(row)}:${key}`;

const shouldShowCellError = (row: Record<string, any>, key: string, required?: boolean) =>
  Boolean(required && touchedCells.value.has(getCellId(row, key)) && isCellMissing(row, key));

watch(
  () => props.modelValue,
  (val) => {
    rows.value = Array.isArray(val) ? val : [];
    if (!isEmitting) touchedCells.value = new Set();
  },
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
  touchedCells.value = new Set(
    [...touchedCells.value]
      .filter((cellId) => Number(cellId.split(':')[0]) !== index)
      .map((cellId) => {
        const [rowIndex, key] = cellId.split(':');
        const nextIndex = Number(rowIndex) > index ? Number(rowIndex) - 1 : Number(rowIndex);
        return `${nextIndex}:${key}`;
      })
  );
  emitUpdate();
};

const handleCellChange = (row: Record<string, any>, key: string) => {
  touchedCells.value = new Set([...touchedCells.value, getCellId(row, key)]);
  emitUpdate();
};

const emitUpdate = () => {
  const nextRows = [...rows.value];
  isEmitting = true;
  emit('update:modelValue', nextRows);
  emit('change', nextRows);
  nextTick(() => {
    isEmitting = false;
  });
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
