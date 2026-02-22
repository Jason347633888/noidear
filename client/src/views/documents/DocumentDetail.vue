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

      <!-- 驳回原因提示 -->
      <el-alert
        v-if="document.status === 'rejected' && latestRejection?.comment"
        type="error"
        :title="`驳回原因: ${latestRejection.comment}`"
        :closable="false"
        style="margin-top: 16px"
      />

      <div class="actions-wrap">
        <el-button type="primary" @click="showPreview = true" :disabled="document.status === 'inactive'">
          <el-icon><View /></el-icon>
          预览文件
        </el-button>
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
          type="warning"
          v-if="document.status === 'rejected'"
          @click="handleSubmit"
        >
          重新提交
        </el-button>
        <el-button
          type="warning"
          v-if="document.status === 'pending'"
          @click="handleWithdraw"
        >
          撤回
        </el-button>
        <el-button
          type="primary"
          v-if="document.status === 'draft' || document.status === 'rejected'"
          @click="$router.push(`/documents/${document.id}/edit`)"
        >
          编辑文档
        </el-button>
        <el-button
          type="danger"
          v-if="document.status === 'draft' || document.status === 'rejected'"
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
        <el-button
          type="warning"
          v-if="document.status === 'approved' && (isCreator || isAdmin)"
          @click="showArchiveDialog"
        >
          归档
        </el-button>
        <el-button
          type="danger"
          v-if="document.status === 'approved' && isAdmin"
          @click="showObsoleteDialog"
        >
          作废
        </el-button>
        <el-button
          type="success"
          v-if="document.status === 'archived' && isAdmin"
          @click="showRestoreDialog"
        >
          恢复
        </el-button>
      </div>
    </el-card>

    <!-- 归档/作废原因提示 -->
    <el-alert
      v-if="document?.status === 'archived' && document.archiveReason"
      type="warning"
      :title="`归档原因: ${document.archiveReason}`"
      :closable="false"
      style="margin-top: 16px;"
    />
    <el-alert
      v-if="document?.status === 'obsolete' && document.obsoleteReason"
      type="error"
      :title="`作废原因: ${document.obsoleteReason}`"
      :closable="false"
      style="margin-top: 16px;"
    />

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

    <!-- 文件预览对话框 -->
    <FilePreviewDialog
      v-model="showPreview"
      :document-id="document?.id || ''"
      :filename="document?.fileName || ''"
    />

    <!-- 归档对话框 -->
    <el-dialog v-model="archiveDialogVisible" title="归档文档" width="500px">
      <el-form :model="archiveForm" :rules="archiveRules" ref="archiveFormRef">
        <el-form-item label="归档原因" prop="reason">
          <el-input
            v-model="archiveForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入归档原因（至少10个字符）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="archiveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleArchive" :loading="archiving">
          确认归档
        </el-button>
      </template>
    </el-dialog>

    <!-- 作废对话框 -->
    <el-dialog v-model="obsoleteDialogVisible" title="作废文档" width="500px">
      <el-form :model="obsoleteForm" :rules="obsoleteRules" ref="obsoleteFormRef">
        <el-form-item label="作废原因" prop="reason">
          <el-input
            v-model="obsoleteForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入作废原因（至少10个字符）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="obsoleteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleObsolete" :loading="obsoleting">
          确认作废
        </el-button>
      </template>
    </el-dialog>

    <!-- 恢复对话框 -->
    <el-dialog v-model="restoreDialogVisible" title="恢复归档文档" width="500px">
      <el-form :model="restoreForm" :rules="restoreRules" ref="restoreFormRef">
        <el-form-item label="恢复原因" prop="reason">
          <el-input
            v-model="restoreForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入恢复原因（至少10个字符）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="restoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRestore" :loading="restoring">
          确认恢复
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Download, View } from '@element-plus/icons-vue';
import request from '@/api/request';
import FilePreviewDialog from '@/components/FilePreviewDialog.vue';
import { useUserStore } from '@/stores/user';

interface VersionItem {
  id: string;
  version: number;
  fileName: string;
  fileSize: string;
  createdAt: string;
  creator: { name: string } | null;
}

interface Approval {
  id: string;
  status: string;
  comment: string | null;
  createdAt: string;
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
  creatorId: string;
  creator: { name: string } | null;
  approver: { name: string } | null;
  approvedAt: string | null;
  createdAt: string;
  approvals?: Approval[];
  archiveReason?: string | null;
  archivedAt?: string | null;
  obsoleteReason?: string | null;
  obsoletedAt?: string | null;
}

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const document = ref<Document | null>(null);
const versionHistory = ref<VersionItem[]>([]);
const showPreview = ref(false);

// 权限判断
const isCreator = computed(() => document.value?.creatorId === userStore.user?.id);
const isAdmin = computed(() => userStore.user?.role === 'admin');

// 归档/作废/恢复相关
const archiveDialogVisible = ref(false);
const obsoleteDialogVisible = ref(false);
const restoreDialogVisible = ref(false);
const archiving = ref(false);
const obsoleting = ref(false);
const restoring = ref(false);
const archiveFormRef = ref();
const obsoleteFormRef = ref();
const restoreFormRef = ref();

const archiveForm = ref({
  reason: '',
});

const obsoleteForm = ref({
  reason: '',
});

const restoreForm = ref({
  reason: '',
});

const archiveRules = {
  reason: [
    { required: true, message: '请输入归档原因', trigger: 'blur' },
    { min: 10, message: '归档原因至少10个字符', trigger: 'blur' },
  ],
};

const obsoleteRules = {
  reason: [
    { required: true, message: '请输入作废原因', trigger: 'blur' },
    { min: 10, message: '作废原因至少10个字符', trigger: 'blur' },
  ],
};

const restoreRules = {
  reason: [
    { required: true, message: '请输入恢复原因', trigger: 'blur' },
    { min: 10, message: '恢复原因至少10个字符', trigger: 'blur' },
  ],
};

// 获取最新的驳回审批记录
const latestRejection = computed(() => {
  if (!document.value?.approvals) return null;
  const rejections = document.value.approvals.filter(a => a.status === 'rejected');
  return rejections.length > 0 ? rejections[0] : null;
});

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
    archived: 'warning',
    obsolete: 'danger',
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
    archived: '已归档',
    obsolete: '已作废',
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
  if (!document.value?.id) {
    return;
  }
  if (document.value.status === 'inactive') {
    ElMessage.warning('该文档已停用，无法下载');
    return;
  }
  window.open(`/api/v1/documents/${document.value.id}/download`, '_blank');
};

const handleSubmit = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm('确定要提交该文档进行审批吗？', '提示');
    await request.post(`/documents/${document.value.id}/submit`);
    ElMessage.success('提交成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

const handleWithdraw = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm('确定要撤回该文档吗？撤回后可重新编辑和提交。', '提示', {
      type: 'warning',
    });
    await request.post(`/documents/${document.value.id}/withdraw`);
    ElMessage.success('撤回成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

const handleDelete = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm('确定要删除该文档吗？此操作不可恢复。', '警告', {
      type: 'warning',
    });
    await request.delete(`/documents/${document.value.id}`);
    ElMessage.success('删除成功');
    router.back();
  } catch {
    // 用户取消
  }
};

const handleDeactivate = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm('确定要停用该文档吗？停用后无法下载。', '提示');
    await request.post(`/documents/${document.value.id}/deactivate`);
    ElMessage.success('停用成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

const showArchiveDialog = () => {
  archiveForm.value.reason = '';
  archiveDialogVisible.value = true;
};

const showObsoleteDialog = () => {
  obsoleteForm.value.reason = '';
  obsoleteDialogVisible.value = true;
};

const showRestoreDialog = () => {
  restoreForm.value.reason = '';
  restoreDialogVisible.value = true;
};

const handleArchive = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await archiveFormRef.value.validate();
    archiving.value = true;
    await request.post(`/documents/${document.value.id}/archive`, {
      reason: archiveForm.value.reason,
    });
    ElMessage.success('归档成功');
    archiveDialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    if (error?.message) {
      // 表单验证失败，不显示错误
    }
  } finally {
    archiving.value = false;
  }
};

const handleObsolete = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await obsoleteFormRef.value.validate();
    obsoleting.value = true;
    await request.post(`/documents/${document.value.id}/obsolete`, {
      reason: obsoleteForm.value.reason,
    });
    ElMessage.success('作废成功');
    obsoleteDialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    if (error?.message) {
      // 表单验证失败，不显示错误
    }
  } finally {
    obsoleting.value = false;
  }
};

const handleRestore = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await restoreFormRef.value.validate();
    restoring.value = true;
    await request.post(`/documents/${document.value.id}/restore`, {
      reason: restoreForm.value.reason,
    });
    ElMessage.success('恢复成功');
    restoreDialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    if (error?.message) {
      // 表单验证失败，不显示错误
    }
  } finally {
    restoring.value = false;
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
