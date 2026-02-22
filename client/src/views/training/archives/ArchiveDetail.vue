<template>
  <div class="archive-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="header">
          <h2>{{ archive.projectTitle }}</h2>
          <el-button type="primary" @click="downloadPdf">
            <el-icon><Download /></el-icon>
            下载PDF
          </el-button>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="培训项目">
          {{ archive.projectTitle }}
        </el-descriptions-item>
        <el-descriptions-item label="部门">
          {{ archive.departmentName }}
        </el-descriptions-item>
        <el-descriptions-item label="培训日期">
          {{ formatDate(archive.trainingDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="生成时间">
          {{ formatDateTime(archive.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="参与学员">
          {{ archive.attendeeCount }} 人
        </el-descriptions-item>
        <el-descriptions-item label="通过人数">
          {{ archive.passedCount }} 人
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- PDF 预览 -->
    <PdfViewer
      :pdfUrl="pdfUrl"
      :downloadFileName="`${archive.projectTitle}_培训档案.pdf`"
      height="800px"
      :showDownloadButton="false"
      :loading="loading"
    />

    <!-- 关联文档记录 -->
    <el-card v-if="relatedDocuments.length > 0">
      <template #header>
        <h3>关联文档记录</h3>
      </template>
      <el-table :data="relatedDocuments">
        <el-table-column prop="title" label="文档标题" />
        <el-table-column prop="type" label="文档类型" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="text" @click="viewDocument(row.id)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import request from '@/api/request';
import PdfViewer from '@/components/PdfViewer.vue';

const route = useRoute();
const router = useRouter();

const archive = ref<any>({});
const relatedDocuments = ref<any[]>([]);
const pdfUrl = ref('');
const loading = ref(false);

const fetchArchive = async () => {
  try {
    loading.value = true;
    const id = route.params.id as string;

    const res = await request.get(`/api/v1/training/archives/${id}`);
    archive.value = res.data || res;

    // 获取 PDF URL
    const pdfRes = await request.get(
      `/api/v1/training/archives/${id}/download`,
      { responseType: 'blob' }
    );
    pdfUrl.value = URL.createObjectURL(new Blob([pdfRes]));

    // 获取关联文档
    if (archive.value.relatedDocuments) {
      relatedDocuments.value = archive.value.relatedDocuments;
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取档案详情失败');
  } finally {
    loading.value = false;
  }
};

const downloadPdf = async () => {
  try {
    const id = route.params.id as string;
    const res = await request.get(`/api/v1/training/archives/${id}/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([res]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${archive.value.projectTitle}_培训档案.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ElMessage.success('下载成功');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '下载失败');
  }
};

const viewDocument = (id: string) => {
  router.push(`/documents/${id}`);
};

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchArchive();
});
</script>

<style scoped>
.archive-detail {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
}

.pdf-preview {
  margin-top: 20px;
}
</style>
