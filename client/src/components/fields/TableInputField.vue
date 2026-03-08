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
          <el-input
            v-if="!col.readonly"
            v-model="row[col.key]"
            size="small"
            @change="emitUpdate"
          />
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
}>();

const rows = ref<Record<string, any>[]>([]);

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

const emitUpdate = () => emit('update:modelValue', [...rows.value]);
</script>
