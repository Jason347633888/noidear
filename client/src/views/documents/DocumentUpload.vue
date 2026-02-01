<template>
  <div class="document-upload">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">上传{{ levelMap[level] || '文档' }}</span>
      </template>
    </el-page-header>

    <el-card class="upload-card">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="文档级别">
          <el-tag>{{ levelMap[level] || `${level}级文件` }}</el-tag>
        </el-form-item>

        <el-form-item label="文档标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入文档标题"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="上传文件" prop="file">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            :on-remove="handleRemove"
            :accept="ACCEPT_TYPES"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处，或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 {{ ACCEPT_TYPES }} 格式，单文件最大 10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="uploading">
            {{ uploading ? '上传中...' : '提交' }}
          </el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules, type UploadFile } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import request from '@/api/request';

const ACCEPT_TYPES = '.pdf,.doc,.docx,.xls,.xlsx';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const uploadRef = ref();
const uploading = ref(false);

const level = computed(() => Number(route.params.level) || 1);

const levelMap: Record<number, string> = {
  1: '一级文件',
  2: '二级文件',
  3: '三级文件',
  4: '四级文件',
};

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

const handleFileChange = (uploadFile: UploadFile) => {
  const file = uploadFile.raw;
  if (!file) return;

  // 验证文件大小
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB');
    uploadRef.value.clearFiles();
    return;
  }

  // 验证文件类型
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const accepted = ACCEPT_TYPES.split(',').map((e) => e.trim());
  if (!accepted.includes(ext)) {
    ElMessage.error(`不支持该文件格式，请上传 ${ACCEPT_TYPES} 格式`);
    uploadRef.value.clearFiles();
    return;
  }

  formData.file = file;
};

const handleExceed = () => {
  ElMessage.warning('最多只能上传 1 个文件');
};

const handleRemove = () => {
  formData.file = null;
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    if (!formData.file) {
      ElMessage.error('请上传文件');
      return;
    }

    uploading.value = true;
    try {
      const form = new FormData();
      form.append('level', String(level.value));
      form.append('title', formData.title);
      form.append('file', formData.file);

      await request.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      ElMessage.success('上传成功');
      router.push(`/documents/level${level.value}`);
    } catch (error) {
      ElMessage.error('上传失败');
    } finally {
      uploading.value = false;
    }
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
.document-upload {
  padding: 0;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
}

.upload-card {
  margin-top: 16px;
  max-width: 800px;
}
</style>
