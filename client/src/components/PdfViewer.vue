<!--
  PdfViewer - 可复用PDF预览组件

  使用场景:
  1. 培训档案预览 (ArchiveDetail.vue)
  2. 文档预览 (DocumentDetail.vue)
  3. 其他业务PDF文件预览

  重要约束:
  - PDF文件必须存储在MinIO对象存储中
  - 通过后端Prisma API获取PDF URL
-->
<template>
  <el-card class="pdf-viewer" v-loading="loading">
    <template #header v-if="showDownloadButton">
      <div class="pdf-toolbar">
        <el-button type="primary" @click="handleDownload">
          <el-icon><Download /></el-icon>
          下载PDF
        </el-button>
      </div>
    </template>

    <div v-if="error" class="pdf-error">
      <el-result icon="error" :title="errorMessage">
        <template #extra>
          <el-button type="primary" @click="emit('retry')">重新加载</el-button>
        </template>
      </el-result>
    </div>

    <el-empty v-else-if="!pdfUrl || !pdfUrl.trim()" description="暂无PDF文件" />

    <div v-else class="pdf-container">
      <iframe
        :src="pdfUrl"
        :style="{ width: '100%', height: computedHeight }"
        frameborder="0"
        @load="handleIframeLoad"
        @error="handleIframeError"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Download } from '@element-plus/icons-vue';

interface PdfViewerProps {
  /** PDF文件URL（来自MinIO对象存储） */
  pdfUrl?: string;
  /** 下载时的文件名，默认'document.pdf' */
  downloadFileName?: string;
  /** iframe高度，默认'800px'，可传入'100vh'、'600px'等 */
  height?: string;
  /** 是否显示下载按钮，默认true */
  showDownloadButton?: boolean;
  /** 是否显示加载状态，默认false */
  loading?: boolean;
  /** 错误信息 */
  error?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
}

const props = withDefaults(defineProps<PdfViewerProps>(), {
  pdfUrl: '',
  downloadFileName: 'document.pdf',
  height: '800px',
  showDownloadButton: true,
  loading: false,
  error: false,
  errorMessage: 'PDF加载失败，请重试',
});

const emit = defineEmits<{
  /** PDF iframe加载完成 */
  loaded: [];
  /** PDF iframe加载失败 */
  'load-error': [];
  /** 用户点击重试按钮 */
  retry: [];
  /** 用户点击下载按钮 */
  download: [];
}>();

const computedHeight = computed(() => props.height);

const handleIframeLoad = () => {
  emit('loaded');
};

const handleIframeError = () => {
  ElMessage.error('PDF加载失败');
  emit('load-error');
};

const handleDownload = async () => {
  if (!props.pdfUrl || !props.pdfUrl.trim()) {
    ElMessage.warning('PDF文件URL无效');
    return;
  }

  try {
    emit('download');

    const response = await fetch(props.pdfUrl);
    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = props.downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    ElMessage.success('下载成功');
  } catch (error) {
    ElMessage.error('下载失败，请重试');
  }
};

defineExpose({
  download: handleDownload,
});
</script>

<style scoped>
.pdf-viewer {
  border-radius: 12px;
}

.pdf-toolbar {
  display: flex;
  justify-content: flex-end;
}

.pdf-error {
  padding: 20px 0;
}

.pdf-container {
  width: 100%;
}

iframe {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
</style>
