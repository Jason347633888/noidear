<!--
  FileUploader - 可复用文件上传组件

  使用场景:
  1. 设备维保照片上传 (RecordForm.vue, FaultCreate.vue) - accept="image/*"
  2. 培训文档上传 (ArchiveDetail.vue等) - accept=".pdf,.doc,.docx,.xls,.xlsx"

  重要约束:
  - uploadFn必须调用后端Prisma API (如equipmentApi.uploadPhoto)
  - 文件类型由父组件通过accept参数控制
  - 设备照片 (image/*): 用于设备维保记录、故障报修等操作场景
  - 业务文档 (PDF/Word/Excel): 用于培训材料、档案等业务文档上传
-->
<template>
  <div class="file-uploader">
    <el-upload
      v-model:file-list="fileList"
      :action="action"
      :http-request="handleUpload"
      :before-upload="beforeUpload"
      :list-type="listType"
      :limit="maxCount"
      :on-exceed="handleExceed"
      :on-preview="handlePreview"
      :on-remove="handleRemove"
      :accept="accept"
      :drag="enableDrag"
      :class="uploaderClass"
    >
      <el-icon v-if="listType === 'picture-card'"><Plus /></el-icon>
      <el-button v-else type="primary">
        <el-icon><Upload /></el-icon>
        {{ uploadButtonText }}
      </el-button>
      <template #tip v-if="showTip">
        <div class="upload-tip">{{ tipText }}</div>
      </template>
    </el-upload>

    <!-- Preview Dialog -->
    <el-dialog
      v-model="previewVisible"
      :title="previewTitle"
      width="600px"
      @close="handlePreviewClose"
    >
      <img v-if="isImagePreview" :src="previewUrl" alt="预览" style="width: 100%" />
      <iframe
        v-else-if="isPdfPreview"
        :src="previewUrl"
        width="100%"
        height="500px"
        frameborder="0"
      />
      <div v-else class="preview-placeholder">
        <el-icon size="64"><Document /></el-icon>
        <p>{{ previewFileName }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadFile, UploadRawFile, UploadRequestOptions } from 'element-plus';
import { Plus, Upload, Document } from '@element-plus/icons-vue';

interface FileUploaderProps {
  /** v-model绑定的文件URL数组 */
  modelValue?: string[];
  /**
   * 上传API函数，接收file参数，返回Promise<{ url: string }>
   * 重要: 该函数必须调用后端Prisma API (如equipmentApi.uploadPhoto)
   * 返回格式: { url: string } 或 { data: { url: string } }
   */
  uploadFn: (file: File | Blob) => Promise<{ url: string } | any>;
  /**
   * 允许上传的文件类型
   * - 设备照片: 'image/*'
   * - 业务文档: '.pdf,.doc,.docx,.xls,.xlsx'
   */
  accept?: string;
  /** 单个文件最大尺寸（字节），默认10MB */
  maxSize?: number;
  /** 最多上传文件数量，默认9 */
  maxCount?: number;
  /** 列表类型：'picture-card' | 'picture' | 'text'，默认'picture-card' */
  listType?: 'picture-card' | 'picture' | 'text';
  /** 是否启用拖拽上传，默认true */
  enableDrag?: boolean;
  /** 是否显示提示文本，默认true */
  showTip?: boolean;
  /** 自定义提示文本 */
  customTip?: string;
  /** 上传按钮文本（仅listType为'text'时有效），默认'上传文件' */
  uploadButtonText?: string;
  /** 预览对话框标题，默认'文件预览' */
  previewTitle?: string;
  /** 上传API的action地址（通常留空，使用http-request） */
  action?: string;
}

const props = withDefaults(defineProps<FileUploaderProps>(), {
  modelValue: () => [],
  accept: 'image/*',
  maxSize: 10 * 1024 * 1024, // 10MB
  maxCount: 9,
  listType: 'picture-card',
  enableDrag: true,
  showTip: true,
  uploadButtonText: '上传文件',
  previewTitle: '文件预览',
  action: '',
});

const emit = defineEmits<{
  'update:modelValue': [urls: string[]];
  'upload-success': [url: string];
  'upload-error': [error: Error];
  'remove': [url: string];
}>();

const fileList = ref<UploadFile[]>([]);
const previewVisible = ref(false);
const previewUrl = ref('');
const previewFileName = ref('');

const uploaderClass = computed(() => ({
  'photo-uploader': props.listType === 'picture-card',
}));

const tipText = computed(() => {
  if (props.customTip) return props.customTip;
  const maxSizeMB = (props.maxSize / 1024 / 1024).toFixed(0);
  const fileType = props.accept.includes('image') ? '照片' : '文件';
  return `最多上传${props.maxCount}个${fileType}，单个不超过${maxSizeMB}MB`;
});

const isImagePreview = computed(() => {
  const url = previewUrl.value.toLowerCase();
  return (
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.png') ||
    url.endsWith('.gif') ||
    url.startsWith('blob:')
  );
});

const isPdfPreview = computed(() => {
  return previewUrl.value.toLowerCase().endsWith('.pdf');
});

// 监听modelValue变化，同步到fileList
watch(
  () => props.modelValue,
  (newUrls) => {
    if (!newUrls || newUrls.length === 0) {
      fileList.value = [];
      return;
    }
    const currentUrls = fileList.value
      .map((f) => f.url || (f.response as any)?.url)
      .filter((url): url is string => Boolean(url && url.trim()));

    const newValidUrls = newUrls.filter((url) => Boolean(url && url.trim()));
    const currentUrlsSet = new Set(currentUrls);
    const newUrlsSet = new Set(newValidUrls);
    const hasChanged =
      currentUrlsSet.size !== newUrlsSet.size ||
      [...newUrlsSet].some((url) => !currentUrlsSet.has(url));

    if (hasChanged) {
      fileList.value = newValidUrls.map((url, index) => ({
        name: `file-${index}`,
        url,
        uid: Date.now() + index,
      }));
    }
  },
  { immediate: true }
);

const beforeUpload = (rawFile: UploadRawFile): boolean => {
  if (rawFile.size > props.maxSize) {
    const maxSizeMB = (props.maxSize / 1024 / 1024).toFixed(0);
    ElMessage.warning(`文件大小超过${maxSizeMB}MB限制`);
    return false;
  }
  return true;
};

const handleUpload = async (options: UploadRequestOptions) => {
  try {
    const res = await props.uploadFn(options.file);
    if (!res || typeof res !== 'object') {
      throw new Error('Invalid upload response');
    }

    let url: string | undefined;
    if ('url' in res && typeof res.url === 'string') {
      url = res.url;
    } else if ('data' in res && res.data && typeof res.data === 'object' && 'url' in res.data) {
      url = (res.data as any).url;
    }

    if (!url || !url.trim()) {
      throw new Error('Upload response missing valid URL');
    }

    const updatedUrls = [...props.modelValue, url];
    emit('update:modelValue', updatedUrls);
    emit('upload-success', url);

    options.onSuccess?.(res);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Upload failed');
    ElMessage.error('文件上传失败，请重试');
    emit('upload-error', err);
    options.onError?.(err as any);
  }
};

const handleExceed = () => {
  ElMessage.warning(`最多上传${props.maxCount}个文件`);
};

const handlePreview = (file: UploadFile) => {
  const url = file.url || '';
  if (!url.trim()) {
    ElMessage.warning('无法预览该文件');
    return;
  }
  previewUrl.value = url;
  previewFileName.value = file.name || '未命名文件';
  previewVisible.value = true;
};

const handleRemove = (file: UploadFile) => {
  const responseUrl = (file.response as any)?.url;
  const url = responseUrl || file.url || '';
  if (url && url.trim()) {
    const updatedUrls = props.modelValue.filter((u) => u !== url);
    emit('update:modelValue', updatedUrls);
    emit('remove', url);
  }
};

const handlePreviewClose = () => {
  previewVisible.value = false;
  previewUrl.value = '';
  previewFileName.value = '';
};

defineExpose({
  clearFiles: () => {
    fileList.value = [];
    emit('update:modelValue', []);
  },
});
</script>

<style scoped>
.file-uploader {
  width: 100%;
}

.photo-uploader :deep(.el-upload-dragger) {
  border-color: #dcdfe6;
  border-radius: 8px;
}

.upload-tip {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 8px;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #909399;
}

.preview-placeholder p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
