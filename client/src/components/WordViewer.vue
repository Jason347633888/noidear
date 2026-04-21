<template>
  <div class="word-viewer">
    <div v-if="loading" class="viewer-loading">
      <el-skeleton :rows="8" animated />
    </div>
    <div v-else-if="htmlUrl" class="iframe-wrapper">
      <iframe
        :src="htmlUrl"
        class="word-iframe"
        frameborder="0"
        sandbox="allow-same-origin allow-scripts"
        title="Word 文档预览"
      />
    </div>
    <el-empty
      v-else-if="error"
      :description="error"
      :image-size="80"
    >
      <el-button @click="load">重新加载</el-button>
    </el-empty>
    <el-empty v-else description="无预览内容" :image-size="80" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

interface ConvertResult {
  htmlUrl: string;
  cachedAt?: string;
}

const props = defineProps<{
  filePath: string;
}>();

const loading = ref(false);
const htmlUrl = ref('');
const error = ref('');

const load = async () => {
  if (!props.filePath) return;
  loading.value = true;
  error.value = '';
  htmlUrl.value = '';
  try {
    const res = await request.post<ConvertResult>('/documents/convert', {
      minioPath: props.filePath,
    });
    htmlUrl.value = res.htmlUrl;
  } catch (err: any) {
    const msg = err?.response?.data?.message || 'Word 文档转换失败，请检查 LibreOffice 是否已安装';
    error.value = msg;
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
};

watch(() => props.filePath, () => {
  load();
});

onMounted(() => {
  load();
});
</script>

<style scoped>
.word-viewer {
  width: 100%;
  min-height: 480px;
}

.viewer-loading {
  padding: 24px;
}

.iframe-wrapper {
  width: 100%;
  height: 100%;
}

.word-iframe {
  width: 100%;
  height: 700px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #fff;
}
</style>
