<template>
  <el-dialog
    v-model="visible"
    :title="`预览: ${filename}`"
    width="90%"
    :fullscreen="fullscreen"
    destroy-on-close
  >
    <div v-loading="loading" class="preview-container">
      <!-- PDF 预览 -->
      <div v-if="previewData?.type === 'pdf'" class="pdf-preview">
        <!-- 移动端：显示下载提示 -->
        <div v-if="isMobile" class="mobile-hint">
          <el-alert
            title="移动端暂不支持在线预览，请下载后查看"
            type="info"
            :closable="false"
            show-icon
          />
          <el-button
            type="primary"
            size="large"
            style="margin-top: 20px"
            @click="handleDownload"
          >
            <el-icon><Download /></el-icon>
            下载文件
          </el-button>
        </div>

        <!-- Safari: 使用 iframe -->
        <iframe
          v-else-if="isSafari && previewData.url"
          :src="previewData.url"
          width="100%"
          height="700px"
          frameborder="0"
        />

        <!-- 其他浏览器: 使用 embed -->
        <embed
          v-else-if="previewData.url"
          :src="previewData.url"
          type="application/pdf"
          width="100%"
          height="700px"
        />
      </div>

      <!-- Word/Excel 下载提示 -->
      <div v-else-if="previewData?.message" class="download-hint">
        <el-alert
          :title="previewData.message"
          type="info"
          :closable="false"
          show-icon
        />
        <el-button
          type="primary"
          size="large"
          style="margin-top: 20px"
          @click="handleDownload"
        >
          <el-icon><Download /></el-icon>
          下载文件
        </el-button>
      </div>

      <!-- 未知类型 -->
      <div v-else class="unknown-type">
        <el-alert
          title="该文件类型暂不支持预览，请下载后查看"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="fullscreen = !fullscreen">
        <el-icon><FullScreen /></el-icon>
        {{ fullscreen ? '退出全屏' : '全屏' }}
      </el-button>
      <el-button type="primary" @click="handleDownload">
        <el-icon><Download /></el-icon>
        下载原文件
      </el-button>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, FullScreen } from '@element-plus/icons-vue';
import filePreviewApi, { PreviewResult } from '@/api/file-preview';

const props = defineProps<{
  modelValue: boolean;
  documentId: string;
  filename: string;
}>();

const emit = defineEmits(['update:modelValue']);

const visible = ref(props.modelValue);
const fullscreen = ref(false);
const loading = ref(false);
const previewData = ref<PreviewResult | null>(null);

// 浏览器检测
const isMobile = computed(() => /Mobi|Android/i.test(navigator.userAgent));
const isSafari = computed(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent));

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
    if (val) {
      loadPreview();
    }
  },
);

watch(visible, (val) => {
  emit('update:modelValue', val);
});

const loadPreview = async () => {
  if (!props.documentId) {
    return;
  }

  loading.value = true;
  try {
    previewData.value = await filePreviewApi.getPreviewInfo(props.documentId);
  } catch (error: any) {
    ElMessage.error(error?.message || '获取预览信息失败');
    visible.value = false;
  } finally {
    loading.value = false;
  }
};

const handleDownload = () => {
  window.open(filePreviewApi.getDownloadUrl(props.documentId), '_blank');
};
</script>

<style scoped>
.preview-container {
  min-height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pdf-preview {
  width: 100%;
  height: 100%;
}

.download-hint,
.unknown-type,
.mobile-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.download-hint :deep(.el-alert),
.mobile-hint :deep(.el-alert) {
  max-width: 600px;
}
</style>
