<template>
  <div class="upload-page">
    <div class="page-header">
      <el-page-header @back="$router.back()" class="page-header-inner">
        <template #content>
          <span class="page-title">上传{{ levelMap[level] || '文档' }}</span>
        </template>
      </el-page-header>
    </div>

    <el-card class="upload-card">
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px" class="upload-form">
        <el-form-item label="文档级别">
          <el-tag type="warning" effect="light" size="large" class="level-tag">
            {{ levelMap[level] || `${level}级文件` }}
          </el-tag>
        </el-form-item>

        <el-form-item label="文档标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入文档标题"
            maxlength="200"
            show-word-limit
            class="title-input"
          />
        </el-form-item>

        <el-form-item label="上传文件" prop="file" class="file-item">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            :on-remove="handleRemove"
            :accept="ACCEPT_TYPES"
            drag
            class="upload-area"
            :class="{ 'has-file': formData.file }"
          >
            <div class="upload-content" v-if="!formData.file">
              <div class="upload-icon">
                <el-icon :size="48"><UploadFilled /></el-icon>
              </div>
              <div class="upload-text">
                <span class="primary-text">拖拽文件到此处，或 <em>点击上传</em></span>
                <span class="secondary-text">支持 {{ ACCEPT_TYPES }} 格式，单文件最大 10MB</span>
              </div>
            </div>
            <div class="file-info" v-else>
              <div class="file-icon">
                <el-icon :size="32"><Document /></el-icon>
              </div>
              <div class="file-details">
                <span class="file-name">{{ formData.file.name }}</span>
                <span class="file-size">{{ formatSize(formData.file.size) }}</span>
              </div>
              <el-button type="danger" size="small" circle @click.stop="handleRemove">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </el-upload>
        </el-form-item>

        <el-form-item class="form-actions">
          <el-button type="primary" @click="handleSubmit" :loading="uploading" class="submit-btn">
            {{ uploading ? '上传中...' : '提交审批' }}
          </el-button>
          <el-button @click="$router.back()" class="cancel-btn">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules, type UploadFile } from 'element-plus';
import { UploadFilled, Document, Close } from '@element-plus/icons-vue';
import request from '@/api/request';

const ACCEPT_TYPES = '.pdf,.doc,.docx,.xls,.xlsx';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const uploadRef = ref();
const uploading = ref(false);

const level = computed(() => Number(route.params.level) || 1);
const levelMap: Record<number, string> = { 1: '一级文件', 2: '二级文件', 3: '三级文件', 4: '四级文件' };

const formData = reactive({
  title: '',
  file: null as File | null,
});

const rules: FormRules = {
  title: [
    { required: true, message: '请输入文档标题', trigger: 'blur' },
    { min: 1, max: 200, message: '标题长度在 1-200 个字符', trigger: 'blur' },
  ],
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleFileChange = (uploadFile: UploadFile) => {
  const file = uploadFile.raw;
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB');
    uploadRef.value.clearFiles();
    return;
  }
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const accepted = ACCEPT_TYPES.split(',').map((e) => e.trim());
  if (!accepted.includes(ext)) {
    ElMessage.error(`不支持该文件格式，请上传 ${ACCEPT_TYPES} 格式`);
    uploadRef.value.clearFiles();
    return;
  }
  formData.file = file;
};

const handleExceed = () => ElMessage.warning('最多只能上传 1 个文件');
const handleRemove = () => { formData.file = null; uploadRef.value?.clearFiles(); };

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    if (!formData.file) { ElMessage.error('请上传文件'); return; }
    uploading.value = true;
    try {
      const form = new FormData();
      form.append('level', String(level.value));
      form.append('title', formData.title);
      form.append('file', formData.file);
      await request.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      ElMessage.success('上传成功，文档已提交审批');
      router.push(`/documents/level${level.value}`);
    } catch { ElMessage.error('上传失败'); }
    finally { uploading.value = false; }
  });
};

onMounted(() => {
  if (![1, 2, 3, 4].includes(level.value)) {
    ElMessage.error('无效的文档级别');
    router.back();
  }
});
</script>

<style scoped>
.upload-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  --bg: #f5f6fa;
  --white: #ffffff;
}

.upload-page {
  font-family: 'Inter', sans-serif;
  max-width: 720px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header-inner :deep(.el-page-header__content) {
  font-size: 18px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 24px;
  font-weight: 600;
  color: var(--primary);
}

.upload-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.level-tag {
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  padding: 8px 16px;
}

.title-input :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.file-item {
  margin-bottom: 32px;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload) {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: auto;
  padding: 48px 24px;
  border-radius: 12px;
  border: 2px dashed #e0e0e0;
  background: #fafafa;
  transition: all 0.3s ease;
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: var(--accent);
  background: #fff;
}

.upload-area.has-file :deep(.el-upload-dragger) {
  padding: 24px;
  border-style: solid;
  border-color: var(--accent);
  background: #fff;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(201, 162, 39, 0.1) 0%, rgba(201, 162, 39, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.upload-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.primary-text {
  font-size: 15px;
  color: var(--text);
}

.primary-text em {
  color: var(--accent);
  font-style: normal;
  cursor: pointer;
}

.secondary-text {
  font-size: 12px;
  color: var(--text-light);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 10px;
}

.file-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent) 0%, #d4af37 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  word-break: break-all;
}

.file-size {
  font-size: 12px;
  color: var(--text-light);
}

.form-actions {
  margin-top: 24px;
}

.submit-btn {
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #d4af37 100%);
  border: none;
  padding: 12px 32px;
  font-weight: 500;
  letter-spacing: 2px;
}

.submit-btn:hover {
  box-shadow: 0 4px 12px rgba(201, 162, 39, 0.3);
}

.cancel-btn {
  border-radius: 8px;
}
</style>
