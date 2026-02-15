<template>
  <div class="excel-upload">
    <el-upload
      ref="uploadRef"
      :auto-upload="false"
      :limit="1"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :accept="acceptedTypes"
      :before-upload="beforeUpload"
      drag
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">
        拖拽文件到此处或 <em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          支持 .xlsx, .xls 格式,文件大小不超过 {{ maxSizeMB }}MB
        </div>
      </template>
    </el-upload>

    <div v-if="uploading" class="upload-progress">
      <el-progress :percentage="uploadProgress" />
      <p>正在解析Excel文件...</p>
    </div>

    <div v-if="parsedFields.length > 0" class="preview-section">
      <el-divider>解析结果预览</el-divider>

      <el-alert
        :title="`成功解析 ${parsedFields.length} 个字段`"
        type="success"
        :closable="false"
        show-icon
        class="preview-alert"
      />

      <el-table :data="parsedFields" border class="preview-table">
        <el-table-column prop="name" label="字段名" width="150" />
        <el-table-column prop="label" label="标签" width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="required" label="必填" width="80">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'" size="small">
              {{ row.required ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="options" label="选项" min-width="200">
          <template #default="{ row }">
            <span v-if="row.options && row.options.length > 0">
              {{ row.options.map((opt: any) => opt.label).join(', ') }}
            </span>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="preview-actions">
        <el-button @click="handleClear">清空</el-button>
        <el-button type="primary" @click="handleImport">
          一键导入到编辑器
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import type { UploadFile, UploadInstance } from 'element-plus';
import request from '@/api/request';

interface FieldOption {
  label: string;
  value: string | number;
}

interface ParsedField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: FieldOption[];
}

const props = defineProps({
  maxSize: {
    type: Number,
    default: 5 * 1024 * 1024, // 5MB
  },
});

const emit = defineEmits<{
  (e: 'import', fields: ParsedField[]): void;
}>();

const uploadRef = ref<UploadInstance>();
const uploading = ref(false);
const uploadProgress = ref(0);
const parsedFields = ref<ParsedField[]>([]);
const currentFile = ref<File | null>(null);

const maxSizeMB = computed(() => props.maxSize / (1024 * 1024));
const acceptedTypes = '.xlsx,.xls';

const typeLabels: Record<string, string> = {
  text: '文本',
  textarea: '多行文本',
  number: '数字',
  date: '日期',
  datetime: '日期时间',
  select: '单选下拉',
  radio: '单选按钮',
  checkbox: '多选',
  boolean: '开关',
  cascader: '级联选择',
  upload: '文件上传',
};

const getTypeLabel = (type: string): string => {
  return typeLabels[type] || type;
};

const beforeUpload = (file: File): boolean => {
  const isValidType = /\.(xlsx?|xls)$/i.test(file.name);
  const isValidSize = file.size <= props.maxSize;

  if (!isValidType) {
    ElMessage.error('只支持 .xlsx 或 .xls 格式的文件');
    return false;
  }

  if (!isValidSize) {
    ElMessage.error(`文件大小不能超过 ${maxSizeMB.value}MB`);
    return false;
  }

  return true;
};

const handleFileChange = async (uploadFile: UploadFile) => {
  if (!uploadFile.raw) return;

  if (!beforeUpload(uploadFile.raw)) {
    uploadRef.value?.clearFiles();
    return;
  }

  currentFile.value = uploadFile.raw;
  await parseExcel(uploadFile.raw);
};

const handleFileRemove = () => {
  currentFile.value = null;
  parsedFields.value = [];
  uploadProgress.value = 0;
};

const parseExcel = async (file: File) => {
  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const formData = new FormData();
    formData.append('file', file);

    // 模拟进度
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10;
      }
    }, 100);

    const res = await request.post<ParsedField[]>('/templates/parse-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    parsedFields.value = res;
    ElMessage.success(`成功解析 ${res.length} 个字段`);
  } catch (error: any) {
    ElMessage.error(error.message || 'Excel 解析失败');
    uploadRef.value?.clearFiles();
  } finally {
    uploading.value = false;
  }
};

const handleClear = () => {
  uploadRef.value?.clearFiles();
  parsedFields.value = [];
  currentFile.value = null;
  uploadProgress.value = 0;
};

const handleImport = () => {
  if (parsedFields.value.length === 0) {
    ElMessage.warning('没有可导入的字段');
    return;
  }

  emit('import', parsedFields.value);
  ElMessage.success('字段已导入到编辑器');
};
</script>

<style scoped>
.excel-upload {
  width: 100%;
}

.upload-progress {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  text-align: center;
}

.upload-progress p {
  margin-top: 8px;
  color: #606266;
  font-size: 14px;
}

.preview-section {
  margin-top: 24px;
}

.preview-alert {
  margin-bottom: 16px;
}

.preview-table {
  margin-bottom: 16px;
}

.empty-text {
  color: #909399;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.el-icon--upload {
  font-size: 67px;
  color: #8c939d;
  margin: 40px 0 16px;
  line-height: 50px;
}
</style>
