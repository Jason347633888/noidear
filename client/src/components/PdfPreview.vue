<template>
  <el-dialog
    :model-value="visible"
    title="PDF 预览"
    width="80%"
    top="5vh"
    @close="$emit('update:visible', false)"
  >
    <div class="pdf-preview-container" v-loading="loading">
      <iframe
        v-if="pdfUrl"
        :src="pdfUrl"
        class="pdf-iframe"
        frameborder="0"
      />
      <el-empty v-else-if="!loading" description="暂无 PDF 数据" />
    </div>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
      <el-button type="primary" @click="handleDownload">下载</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  visible: boolean;
  url?: string;
  blobData?: Blob | null;
}>();

defineEmits<{
  'update:visible': [value: boolean];
}>();

const loading = ref(false);
const pdfUrl = ref('');

watch(() => props.visible, (val) => {
  if (!val) {
    revokePdfUrl();
    return;
  }
  if (props.url) {
    pdfUrl.value = props.url;
  } else if (props.blobData) {
    pdfUrl.value = URL.createObjectURL(props.blobData);
  }
});

const revokePdfUrl = () => {
  if (pdfUrl.value && pdfUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(pdfUrl.value);
  }
  pdfUrl.value = '';
};

const handleDownload = () => {
  if (!pdfUrl.value) {
    ElMessage.warning('暂无可下载的 PDF');
    return;
  }
  const link = document.createElement('a');
  link.href = pdfUrl.value;
  link.download = 'document.pdf';
  link.click();
};
</script>

<style scoped>
.pdf-preview-container {
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
