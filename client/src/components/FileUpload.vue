<template>
  <el-upload
    v-model:file-list="fileList"
    :action="uploadUrl"
    :headers="uploadHeaders"
    :before-upload="handleBeforeUpload"
    :on-success="handleSuccess"
    :on-error="handleError"
    :on-exceed="handleExceed"
    :on-remove="handleRemove"
    :drag="drag"
    :multiple="multiple"
    :limit="limit"
    :accept="accept"
    :disabled="disabled"
    class="file-upload"
  >
    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
    <div class="el-upload__text">
      拖拽文件到此处，或 <em>点击上传</em>
    </div>
    <template #tip>
      <div class="el-upload__tip">
        <slot name="tip">
          <span v-if="accept">支持 {{ accept }} 格式</span>
          <span v-if="maxSize">，单文件最大 {{ formatSize(maxSize) }}</span>
          <span v-if="limit && multiple">，最多上传 {{ limit }} 个文件</span>
        </slot>
      </div>
    </template>
  </el-upload>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';

interface UploadFile {
  name: string;
  url?: string;
  uid: number;
}

const props = withDefaults(
  defineProps<{
    modelValue?: UploadFile[];
    limit?: number;
    accept?: string;
    maxSize?: number; // bytes
    multiple?: boolean;
    drag?: boolean;
    disabled?: boolean;
  }>(),
  {
    limit: 10,
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    drag: true,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: UploadFile[]): void;
  (e: 'success', response: unknown, file: File): void;
  (e: 'error', error: Error): void;
}>();

const uploadUrl = '/api/v1/documents/upload';
const fileList = ref<UploadFile[]>([]);

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
}));

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleBeforeUpload = (file: File): boolean => {
  // 检查文件大小
  if (props.maxSize && file.size > props.maxSize) {
    ElMessage.error(`文件大小不能超过 ${formatSize(props.maxSize)}`);
    return false;
  }

  // 检查文件类型
  if (props.accept) {
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const accepted = props.accept.split(',').map((e) => e.trim().toLowerCase());
    if (!accepted.includes(ext)) {
      ElMessage.error(`不支持该文件格式，请上传 ${props.accept} 格式`);
      return false;
    }
  }

  return true;
};

const handleSuccess = (response: { code: number; data: { url: string; name: string } }, file: File) => {
  if (response.code === 0) {
    ElMessage.success('上传成功');
    emit('success', response, file);
    updateFileList();
  } else {
    ElMessage.error(response.data?.message || '上传失败');
  }
};

const handleError = (error: Error) => {
  ElMessage.error('上传失败');
  emit('error', error);
};

const handleExceed = () => {
  ElMessage.warning(`最多只能上传 ${props.limit} 个文件`);
};

const handleRemove = () => {
  updateFileList();
};

const updateFileList = () => {
  emit('update:modelValue', fileList.value);
};
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.el-upload__tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
</style>
