<template>
  <el-button
    type="primary"
    :icon="Download"
    :loading="isExporting"
    :disabled="disabled"
    @click="handleClick"
  >
    {{ isExporting ? '导出中...' : text }}
  </el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Download } from '@element-plus/icons-vue';

interface Props {
  text?: string;
  disabled?: boolean;
  exportFn?: () => Promise<Blob>;
  filename?: string;
}

const props = withDefaults(defineProps<Props>(), {
  text: '导出',
  disabled: false,
  filename: '导出数据.xlsx'
});

const emit = defineEmits<{
  click: [];
  success: [];
  error: [error: Error];
}>();

const isExporting = ref(false);

const handleClick = async () => {
  emit('click');

  if (!props.exportFn) return;

  isExporting.value = true;
  try {
    const blob = await props.exportFn();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = props.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
    emit('success');
  } catch (error: any) {
    ElMessage.error(`导出失败: ${error.message || '未知错误'}`);
    emit('error', error);
  } finally {
    isExporting.value = false;
  }
};
</script>
