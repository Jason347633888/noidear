<template>
  <div class="document-detail" v-loading="loading">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">{{ document?.title }}</span>
      </template>
    </el-page-header>

    <el-card class="info-card" v-if="document">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="文档编号">{{ document.number }}</el-descriptions-item>
        <el-descriptions-item label="文档级别">
          <el-tag>{{ document.level }}级文件</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(document.status)">
            {{ getStatusText(document.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="版本号">v{{ document.version }}</el-descriptions-item>
        <el-descriptions-item label="文件名">{{ document.fileName }}</el-descriptions-item>
        <el-descriptions-item label="文件大小">{{ formatSize(Number(document.fileSize)) }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ document.creator?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(document.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="审批人" v-if="document.approver">
          {{ document.approver.name }}
        </el-descriptions-item>
        <el-descriptions-item label="审批时间" v-if="document.approvedAt">
          {{ formatDate(document.approvedAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="actions-wrap">
        <el-button type="primary" @click="handleDownload" :disabled="document.status === 'inactive'">
          <el-icon><Download /></el-icon>
          下载文件
        </el-button>
        <el-button
          type="success"
          v-if="document.status === 'draft'"
          @click="handleSubmit"
        >
          提交审批
        </el-button>
        <el-button
          type="primary"
          v-if="document.status === 'draft'"
          @click="$router.push(`/documents/${document.id}/edit`)"
        >
          编辑文档
        </el-button>
        <el-button
          type="danger"
          v-if="document.status === 'draft'"
          @click="handleDelete"
        >
          删除文档
        </el-button>
        <el-button
          type="warning"
          v-if="document.status === 'approved'"
          @click="handleDeactivate"
        >
          停用文档
        </el-button>
      </div>
    </el-card>

    <el-card class="version-card" v-if="versionHistory.length">
      <template #header>
        <span>版本历史</span>
      </template>
      <el-table :data="versionHistory" stripe>
        <el-table-column prop="version" label="版本" width="80">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" min-width="150" />
        <el-table-column prop="fileSize" label="大小" width="100">
          <template #default="{ row }">{{ formatSize(Number(row.fileSize)) }}</template>
        </el-table-column>
        <el-table-column prop="creator.name" label="操作人" width="100" />
        <el-table-column prop="createdAt" label="操作时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import request from '@/api/request';

interface VersionItem {
  id: string;
  version: number;
  fileName: string;
  fileSize: string;
  createdAt: string;
  creator: { name: string } | null;
}

interface Document {
  id: string;
  number: string;
  level: number;
  title: string;
  fileName: string;
  fileSize: string;
  filePath: string;
  status: string;
  version: number;
  creator: { name: string } | null;
  approver: { name: string } | null;
  approvedAt: string | null;
  createdAt: string;
}

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const document = ref<Document | null>(null);
const versionHistory = ref<VersionItem[]>([]);

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN');
};

const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    inactive: 'info',
  };
  return map[status] || 'info';
};

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    draft: '草稿',
    pending: '待审批',
    approved: '已发布',
    rejected: '已驳回',
    inactive: '已停用',
  };
  return map[status] || status;
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<Document>(`/documents/${route.params.id}`);
    document.value = res;
  } catch (error) {
    ElMessage.error('获取文档详情失败');
  } finally {
    loading.value = false;
  }
};

const fetchVersionHistory = async () => {
  try {
    const res = await request.get<{ versions: VersionItem[] }>(`/documents/${route.params.id}/versions`);
    versionHistory.value = res.versions || [];
  } catch (error) {
    // 版本历史获取失败不影响主流程
  }
};

const handleDownload = () => {
  if (document.value?.status === 'inactive') {
    ElMessage.warning('该文档已停用，无法下载');
    return;
  }
  window.open(`/api/v1/documents/${document.value?.id}/download`, '_blank');
};

const handleSubmit = async () => {
  try {
    await ElMessageBox.confirm('确定要提交该文档进行审批吗？', '提示');
    await request.post(`/documents/${document.value?.id}/submit`);
    ElMessage.success('提交成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除该文档吗？此操作不可恢复。', '警告', {
      type: 'warning',
    });
    await request.delete(`/documents/${document.value?.id}`);
    ElMessage.success('删除成功');
    router.back();
  } catch {
    // 用户取消
  }
};

const handleDeactivate = async () => {
  try {
    await ElMessageBox.confirm('确定要停用该文档吗？停用后无法下载。', '提示');
    await request.post(`/documents/${document.value?.id}/deactivate`);
    ElMessage.success('停用成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

onMounted(() => {
  fetchData();
  fetchVersionHistory();
});
</script>

<style scoped>
.document-detail {
  padding: 0;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
}

.info-card {
  margin-top: 16px;
}

.actions-wrap {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.version-card {
  margin-top: 16px;
}
</style>
