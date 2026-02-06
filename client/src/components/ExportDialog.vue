<template>
  <el-dialog
    v-model="visible"
    title="导出数据"
    width="600px"
    @close="handleClose"
  >
    <el-form label-width="100px">
      <el-form-item label="导出字段">
        <el-checkbox-group v-model="selectedFields">
          <el-checkbox
            v-for="field in availableFields"
            :key="field.key"
            :label="field.key"
          >
            {{ field.label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="导出格式">
        <el-radio-group v-model="format">
          <el-radio label="xlsx">Excel (xlsx)</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="exporting"
        @click="handleExport"
      >
        导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import exportApi, { type ExportFilters } from '@/api/export';

const props = defineProps<{
  modelValue: boolean;
  type: 'documents' | 'tasks' | 'deviation-reports' | 'approvals';
  filters: ExportFilters;
  defaultFields?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'exported'): void;
}>();

const visible = ref(props.modelValue);
const exporting = ref(false);
const selectedFields = ref<string[]>([]);
const format = ref('xlsx');

const fieldConfigs = {
  documents: [
    { key: 'number', label: '文档编号' },
    { key: 'title', label: '标题' },
    { key: 'level', label: '级别' },
    { key: 'version', label: '版本' },
    { key: 'status', label: '状态' },
    { key: 'creatorName', label: '创建人' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'approverName', label: '审批人' },
    { key: 'approvedAt', label: '审批时间' },
  ],
  tasks: [
    { key: 'templateTitle', label: '模板名称' },
    { key: 'departmentName', label: '部门' },
    { key: 'deadline', label: '截止日期' },
    { key: 'status', label: '状态' },
    { key: 'creatorName', label: '创建人' },
    { key: 'createdAt', label: '创建时间' },
  ],
  'deviation-reports': [
    { key: 'fieldName', label: '字段名称' },
    { key: 'expectedValue', label: '期望值' },
    { key: 'actualValue', label: '实际值' },
    { key: 'deviationAmount', label: '偏离量' },
    { key: 'deviationRate', label: '偏离率' },
    { key: 'deviationType', label: '偏离类型' },
    { key: 'reason', label: '原因' },
    { key: 'status', label: '状态' },
    { key: 'reportedAt', label: '上报时间' },
  ],
  approvals: [
    { key: 'documentNumber', label: '文档编号' },
    { key: 'documentTitle', label: '文档标题' },
    { key: 'approverName', label: '审批人' },
    { key: 'status', label: '状态' },
    { key: 'comment', label: '意见' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'approvedAt', label: '审批时间' },
  ],
};

const availableFields = computed(() => fieldConfigs[props.type] || []);

const exportMethods = {
  documents: exportApi.exportDocuments,
  tasks: exportApi.exportTasks,
  'deviation-reports': exportApi.exportDeviationReports,
  approvals: exportApi.exportApprovals,
};

watch(() => props.modelValue, (value) => {
  visible.value = value;
  if (value) {
    initializeFields();
  }
});

watch(visible, (value) => {
  emit('update:modelValue', value);
});

function initializeFields() {
  if (props.defaultFields && props.defaultFields.length > 0) {
    selectedFields.value = [...props.defaultFields];
  } else {
    selectedFields.value = availableFields.value.map(f => f.key);
  }
}

async function handleExport() {
  if (selectedFields.value.length === 0) {
    ElMessage.warning('请至少选择一个导出字段');
    return;
  }

  exporting.value = true;

  try {
    const exportMethod = exportMethods[props.type];
    const blob = await exportMethod({
      ...props.filters,
      fields: selectedFields.value,
    });

    downloadFile(blob, props.type);

    ElMessage.success('导出成功');
    emit('exported');
    handleClose();
  } catch (error: any) {
    ElMessage.error(`导出失败: ${error.message || '未知错误'}`);
  } finally {
    exporting.value = false;
  }
}

function downloadFile(blob: Blob, type: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_${new Date().getTime()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function handleClose() {
  visible.value = false;
  emit('update:modelValue', false);
}
</script>

<style scoped>
.el-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
