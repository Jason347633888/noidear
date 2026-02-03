<template>
  <div class="approval-page">
    <div class="page-header">
      <h1 class="page-title">待我审批</h1>
      <p class="page-subtitle">处理待审批的文档申请</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">待审批列表</span>
            <el-badge :value="tableData.length" :max="99" class="approval-badge" v-if="tableData.length" />
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe class="approval-table">
        <el-table-column prop="number" label="文档编号" width="180">
          <template #default="{ row }">
            <span class="doc-number">{{ row.number }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="文档标题" min-width="200">
          <template #default="{ row }">
            <div class="doc-info">
              <div class="doc-icon" :class="`level-${row.level}`">
                <el-icon><Document /></el-icon>
              </div>
              <span class="doc-title">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.level }}级</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="申请人" width="100">
          <template #default="{ row }">
            <div class="creator-info">
              <div class="creator-avatar">{{ row.creator?.name?.charAt(0) || 'U' }}</div>
              <span>{{ row.creator?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="handleView(row)" class="action-btn">
                <el-icon><View /></el-icon>查看
              </el-button>
              <el-button link type="success" @click="handleApprove(row)" class="action-btn approve-btn">
                <el-icon><Check /></el-icon>通过
              </el-button>
              <el-button link type="danger" @click="handleReject(row)" class="action-btn reject-btn">
                <el-icon><Close /></el-icon>驳回
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !tableData.length" description="暂无待审批文档" :image-size="120" />
    </el-card>

    <el-dialog v-model="showRejectDialog" title="驳回申请" width="440px" class="reject-dialog">
      <div class="reject-content">
        <div class="reject-header">
          <el-icon class="reject-icon"><Warning /></el-icon>
          <span>请输入驳回原因</span>
        </div>
        <el-input
          v-model="rejectReason"
          type="textarea"
          :rows="4"
          placeholder="请详细说明驳回原因..."
          class="reject-input"
        />
      </div>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="rejecting">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';
import { Document, View, Check, Close, Warning } from '@element-plus/icons-vue';

interface Document {
  id: string;
  number: string;
  title: string;
  level: number;
  creator: { name: string } | null;
  createdAt: string;
}

const router = useRouter();
const loading = ref(false);
const rejecting = ref(false);
const tableData = ref<Document[]>([]);
const showRejectDialog = ref(false);
const rejectReason = ref('');
const currentDoc = ref<Document | null>(null);

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<Document[]>('/documents/pending-approvals');
    tableData.value = res || [];
  } catch { ElMessage.error('获取待审批列表失败'); }
  finally { loading.value = false; }
};

const handleView = (row: Document) => router.push(`/documents/${row.id}`);

const handleApprove = async (row: Document) => {
  try {
    await ElMessageBox.confirm('确定要通过该文档吗？', '确认通过', { confirmButtonText: '通过', cancelButtonText: '取消' });
    await request.post(`/documents/${row.id}/approve`, { status: 'approved' });
    ElMessage.success('已通过');
    fetchData();
  } catch {}
};

const handleReject = (row: Document) => { currentDoc.value = row; rejectReason.value = ''; showRejectDialog.value = true; };

const confirmReject = async () => {
  if (!currentDoc.value || !rejectReason.value.trim()) { ElMessage.warning('请输入驳回原因'); return; }
  rejecting.value = true;
  try {
    await request.post(`/documents/${currentDoc.value.id}/approve`, { status: 'rejected', comment: rejectReason.value });
    ElMessage.success('已驳回');
    showRejectDialog.value = false;
    fetchData();
  } catch { ElMessage.error('操作失败'); }
  finally { rejecting.value = false; }
};

onMounted(fetchData);
</script>

<style scoped>
.approval-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --success: #27ae60;
  --danger: #e74c3c;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  --bg: #f5f6fa;
}

.approval-page {
  font-family: 'Inter', sans-serif;
}

.page-header { margin-bottom: 24px; }

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 4px;
}

.page-subtitle { font-size: 14px; color: var(--text-light); margin: 0; }

.table-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.card-header { display: flex; justify-content: space-between; align-items: center; }

.card-title-wrap { display: flex; align-items: center; gap: 12px; }

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.approval-badge :deep(.el-badge__content) { background: var(--danger); }

.approval-table :deep(th) {
  background: #fafafa;
  font-weight: 500;
  color: var(--text-light);
  font-size: 12px;
}

.doc-number {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: var(--text-light);
}

.doc-info { display: flex; align-items: center; gap: 10px; }

.doc-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.doc-icon.level-1 { background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); }
.doc-icon.level-2 { background: linear-gradient(135deg, #3498db 0%, #5dade2 100%); }
.doc-icon.level-3 { background: linear-gradient(135deg, #9b59b6 0%, #a569bd 100%); }

.doc-title { font-size: 14px; color: var(--text); font-weight: 500; }

.creator-info { display: flex; align-items: center; gap: 8px; }

.creator-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--primary);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.time-text { font-size: 12px; color: var(--text-light); }

.action-btns { display: flex; gap: 4px; }

.action-btn { font-size: 12px; display: flex; align-items: center; gap: 4px; }

.approve-btn { color: var(--success); }
.reject-btn { color: var(--danger); }

.reject-dialog :deep(.el-dialog__header) { padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }

.reject-content { padding: 8px 0; }

.reject-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--danger);
}

.reject-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(231, 76, 60, 0.1);
  border-radius: 6px;
}

.reject-input :deep(.el-textarea__inner) { border-radius: 8px; resize: none; }
</style>
