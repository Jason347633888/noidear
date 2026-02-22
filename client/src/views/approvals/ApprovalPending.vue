<template>
  <div class="approval-page">
    <div class="page-header">
      <h1 class="page-title">待我审批</h1>
      <p class="page-subtitle">处理待审批的任务记录和文档申请</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">待审批列表</span>
            <el-badge :value="filteredData.length" :max="99" class="approval-badge" v-if="filteredData.length" />
          </div>
          <div class="filter-wrap">
            <el-select v-model="filterDocType" placeholder="全部类型" clearable style="width: 140px" size="default">
              <el-option label="全部类型" value="" />
              <el-option label="一级文档" value="1" />
              <el-option label="二级文档" value="2" />
              <el-option label="三级文档" value="3" />
              <el-option label="任务记录" value="task" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="filteredData" v-loading="loading" stripe class="approval-table">
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.documentId ? 'warning' : 'primary'">
              {{ row.documentId ? '文档' : '任务记录' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" min-width="200">
          <template #default="{ row }">
            <div class="doc-info">
              <div class="doc-icon" :class="getSourceClass(row)">
                <el-icon><Document /></el-icon>
              </div>
              <span class="doc-title">{{ getSourceTitle(row) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="审批类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="getApprovalTypeTag(row.approvalType)">
              {{ getApprovalTypeLabel(row.approvalType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="审批级别" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.level }}级</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">
            <div class="creator-info">
              <div class="creator-avatar">{{ getSubmitterInitial(row) }}</div>
              <span>{{ getSubmitterName(row) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="handleView(row)" class="action-btn">
                <el-icon><View /></el-icon>详情
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

      <el-empty v-if="!loading && !filteredData.length" description="暂无待审批记录" :image-size="120" />
    </el-card>

    <!-- 通过确认对话框 -->
    <el-dialog v-model="showApproveDialog" title="确认通过" width="440px" class="approve-dialog">
      <div class="approve-content">
        <p>确定要通过此审批吗？</p>
        <el-input
          v-model="approveComment"
          type="textarea"
          :rows="3"
          placeholder="审批意见（选填）"
          class="approve-input"
        />
      </div>
      <template #footer>
        <el-button @click="showApproveDialog = false">取消</el-button>
        <el-button type="success" @click="confirmApprove" :loading="approving">确认通过</el-button>
      </template>
    </el-dialog>

    <!-- 驳回对话框 -->
    <el-dialog v-model="showRejectDialog" title="驳回申请" width="440px" class="reject-dialog">
      <div class="reject-content">
        <div class="reject-header">
          <el-icon class="reject-icon"><Warning /></el-icon>
          <span>请输入驳回原因（至少10个字符）</span>
        </div>
        <el-input
          v-model="rejectReason"
          type="textarea"
          :rows="4"
          placeholder="请详细说明驳回原因（至少10个字符）..."
          class="reject-input"
        />
        <div class="char-count" :class="{ 'char-warning': rejectReason.length < 10 && rejectReason.length > 0 }">
          {{ rejectReason.length }}/500
        </div>
      </div>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button
          type="danger"
          @click="confirmReject"
          :loading="rejecting"
          :disabled="rejectReason.trim().length < 10"
        >确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import approvalApi from '@/api/approval';
import type { Approval } from '@/api/approval';
import { Document, View, Check, Close, Warning } from '@element-plus/icons-vue';

const router = useRouter();
const loading = ref(false);
const approving = ref(false);
const rejecting = ref(false);
const tableData = ref<Approval[]>([]);
const showApproveDialog = ref(false);
const showRejectDialog = ref(false);
const approveComment = ref('');
const rejectReason = ref('');
const currentApproval = ref<Approval | null>(null);
const filterDocType = ref<string>('');

const filteredData = computed(() => {
  if (!filterDocType.value) return tableData.value;

  return tableData.value.filter((row) => {
    if (filterDocType.value === 'task') {
      return !!row.recordId;
    }
    return row.document?.level?.toString() === filterDocType.value;
  });
});

const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const getSourceTitle = (row: Approval): string => {
  if (row.document) {
    return `${row.document.number || ''} ${row.document.title || ''}`.trim();
  }
  if (row.record?.task?.template) {
    return row.record.task.template.title;
  }
  return row.recordId || row.documentId || '-';
};

const getSourceClass = (row: Approval): string => {
  if (row.document) {
    return `level-${row.document.level || 1}`;
  }
  return 'level-task';
};

const getSubmitterName = (row: Approval): string => {
  if (row.record?.submitter) return row.record.submitter.name;
  if (row.document?.creator) return row.document.creator.name;
  return '-';
};

const getSubmitterInitial = (row: Approval): string => {
  const name = getSubmitterName(row);
  return name.charAt(0) || 'U';
};

const getApprovalTypeLabel = (type?: string): string => {
  const labels: Record<string, string> = {
    single: '单人',
    countersign: '会签',
    sequential: '顺签',
  };
  return labels[type || 'single'] || '单人';
};

const getApprovalTypeTag = (type?: string): '' | 'success' | 'warning' => {
  const tags: Record<string, '' | 'success' | 'warning'> = {
    single: '',
    countersign: 'success',
    sequential: 'warning',
  };
  return tags[type || 'single'] || '';
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await approvalApi.getPendingApprovals();
    tableData.value = (res as unknown as Approval[]) || [];
  } catch {
    ElMessage.error('获取待审批列表失败');
  } finally {
    loading.value = false;
  }
};

const handleView = (row: Approval) => {
  router.push(`/approvals/detail/${row.id}`);
};

const handleApprove = (row: Approval) => {
  currentApproval.value = row;
  approveComment.value = '';
  showApproveDialog.value = true;
};

const confirmApprove = async () => {
  if (!currentApproval.value) return;
  approving.value = true;
  try {
    await approvalApi.approveUnified(
      currentApproval.value.id,
      'approved',
      approveComment.value || undefined,
    );
    ElMessage.success('已通过');
    showApproveDialog.value = false;
    fetchData();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    approving.value = false;
  }
};

const handleReject = (row: Approval) => {
  currentApproval.value = row;
  rejectReason.value = '';
  showRejectDialog.value = true;
};

const confirmReject = async () => {
  if (!currentApproval.value) return;
  if (rejectReason.value.trim().length < 10) {
    ElMessage.warning('驳回原因至少10个字符');
    return;
  }
  rejecting.value = true;
  try {
    await approvalApi.approveUnified(
      currentApproval.value.id,
      'rejected',
      rejectReason.value,
    );
    ElMessage.success('已驳回');
    showRejectDialog.value = false;
    fetchData();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    rejecting.value = false;
  }
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

.filter-wrap { display: flex; gap: 12px; align-items: center; }

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
.doc-icon.level-task { background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); }

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

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.char-warning { color: var(--danger); }

.approve-content p {
  font-size: 14px;
  color: var(--text);
  margin-bottom: 12px;
}

.approve-input :deep(.el-textarea__inner) { border-radius: 8px; resize: none; }
</style>
