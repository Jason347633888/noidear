<template>
  <div class="approval-detail-page">
    <div class="page-header">
      <el-button @click="router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <h1 class="page-title">审批详情</h1>
    </div>

    <div v-loading="loading" class="detail-content">
      <template v-if="approval">
        <!-- 审批状态卡片 -->
        <el-card class="status-card">
          <div class="status-header">
            <div class="status-badge" :class="approval.status">
              {{ statusLabel }}
            </div>
            <div class="status-meta">
              <span class="meta-item">审批级别: {{ approval.level }}级</span>
              <span class="meta-item">审批类型: {{ approvalTypeLabel }}</span>
              <span class="meta-item">创建时间: {{ formatDate(approval.createdAt) }}</span>
              <span v-if="approval.approvedAt" class="meta-item">
                处理时间: {{ formatDate(approval.approvedAt) }}
              </span>
            </div>
          </div>
        </el-card>

        <!-- 审批人信息 -->
        <el-card class="info-card">
          <template #header>
            <span class="card-title">审批人信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="审批人">
              {{ approval.approver?.name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(approval.status)" size="small">
                {{ statusLabel }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="approval.comment" label="审批意见" :span="2">
              {{ approval.comment }}
            </el-descriptions-item>
            <el-descriptions-item v-if="approval.rejectionReason" label="驳回原因" :span="2">
              <span class="rejection-text">{{ approval.rejectionReason }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 关联记录/文档信息 -->
        <el-card v-if="approval.record" class="info-card">
          <template #header>
            <span class="card-title">任务记录信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="提交人">
              {{ approval.record.submitter?.name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="记录状态">
              {{ approval.record.status || '-' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="approval.record.task?.template" label="关联模板" :span="2">
              {{ approval.record.task.template.title }}
            </el-descriptions-item>
          </el-descriptions>

          <!-- 数据展示 -->
          <div v-if="approval.record.dataJson" class="data-section">
            <h4 class="data-title">填写数据</h4>
            <el-table :data="dataEntries" border size="small" class="data-table">
              <el-table-column prop="key" label="字段名" width="200" />
              <el-table-column prop="value" label="填写值" />
            </el-table>
          </div>
        </el-card>

        <el-card v-if="approval.document" class="info-card">
          <template #header>
            <span class="card-title">文档信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="文档编号">
              {{ approval.document.number || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="文档标题">
              {{ approval.document.title || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">
              {{ approval.document.creator?.name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="文档状态">
              {{ approval.document.status || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 审批链信息 -->
        <el-card v-if="chainApprovals.length > 0" class="info-card">
          <template #header>
            <span class="card-title">审批链</span>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="item in chainApprovals"
              :key="item.id"
              :type="getTimelineType(item.status)"
              :timestamp="formatDate(item.approvedAt || item.createdAt)"
              placement="top"
            >
              <div class="timeline-content">
                <span class="timeline-approver">{{ item.approver?.name || '-' }}</span>
                <el-tag size="small" :type="getStatusType(item.status)">
                  {{ getStatusLabel(item.status) }}
                </el-tag>
                <span v-if="item.comment" class="timeline-comment">{{ item.comment }}</span>
                <span v-if="item.rejectionReason" class="timeline-rejection">
                  驳回原因: {{ item.rejectionReason }}
                </span>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <!-- 操作按钮（待审批时显示） -->
        <div v-if="approval.status === 'pending'" class="action-section">
          <el-button type="success" size="large" @click="handleApprove" :loading="approving">
            <el-icon><Check /></el-icon>通过
          </el-button>
          <el-button type="danger" size="large" @click="showRejectDialog = true">
            <el-icon><Close /></el-icon>驳回
          </el-button>
        </div>
      </template>
    </div>

    <!-- 通过确认对话框 -->
    <el-dialog v-model="showApproveDialog" title="确认通过" width="440px">
      <el-input
        v-model="approveComment"
        type="textarea"
        :rows="3"
        placeholder="审批意见（选填）"
      />
      <template #footer>
        <el-button @click="showApproveDialog = false">取消</el-button>
        <el-button type="success" @click="confirmApprove" :loading="approving">确认通过</el-button>
      </template>
    </el-dialog>

    <!-- 驳回对话框 -->
    <el-dialog v-model="showRejectDialog" title="驳回申请" width="440px">
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import approvalApi from '@/api/approval';
import type { Approval } from '@/api/approval';
import { ArrowLeft, Check, Close, Warning } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const approving = ref(false);
const rejecting = ref(false);
const approval = ref<Approval | null>(null);
const chainApprovals = ref<Approval[]>([]);
const showApproveDialog = ref(false);
const showRejectDialog = ref(false);
const approveComment = ref('');
const rejectReason = ref('');

const approvalId = computed(() => route.params.id as string);

const statusLabel = computed(() => getStatusLabel(approval.value?.status || ''));

const approvalTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    single: '单人审批',
    countersign: '会签',
    sequential: '顺签',
  };
  return labels[approval.value?.approvalType || 'single'] || '单人审批';
});

const dataEntries = computed(() => {
  if (!approval.value?.record?.dataJson) return [];
  return Object.entries(approval.value.record.dataJson).map(([key, value]) => ({
    key,
    value: String(value),
  }));
});

const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    waiting: '等待中',
    cancelled: '已取消',
  };
  return labels[status] || status;
};

const getStatusType = (status: string): '' | 'success' | 'danger' | 'warning' | 'info' => {
  const types: Record<string, '' | 'success' | 'danger' | 'warning' | 'info'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    waiting: 'info',
    cancelled: 'info',
  };
  return types[status] || '';
};

const getTimelineType = (status: string): 'primary' | 'success' | 'danger' | 'warning' | 'info' => {
  const types: Record<string, 'primary' | 'success' | 'danger' | 'warning' | 'info'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    waiting: 'info',
    cancelled: 'info',
  };
  return types[status] || 'primary';
};

const fetchDetail = async () => {
  loading.value = true;
  try {
    const res = await approvalApi.getApprovalDetail(approvalId.value);
    approval.value = res as unknown as Approval;

    // 如果有关联记录，获取审批链
    if (approval.value?.recordId) {
      const chain = await approvalApi.getApprovalChain(approval.value.recordId);
      chainApprovals.value = (chain as unknown as Approval[]) || [];
    }
  } catch {
    ElMessage.error('获取审批详情失败');
  } finally {
    loading.value = false;
  }
};

const handleApprove = () => {
  approveComment.value = '';
  showApproveDialog.value = true;
};

const confirmApprove = async () => {
  approving.value = true;
  try {
    await approvalApi.approveUnified(
      approvalId.value,
      'approved',
      approveComment.value || undefined,
    );
    ElMessage.success('已通过');
    showApproveDialog.value = false;
    fetchDetail();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    approving.value = false;
  }
};

const confirmReject = async () => {
  if (rejectReason.value.trim().length < 10) {
    ElMessage.warning('驳回原因至少10个字符');
    return;
  }
  rejecting.value = true;
  try {
    await approvalApi.approveUnified(
      approvalId.value,
      'rejected',
      rejectReason.value,
    );
    ElMessage.success('已驳回');
    showRejectDialog.value = false;
    fetchDetail();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    rejecting.value = false;
  }
};

onMounted(fetchDetail);
</script>

<style scoped>
.approval-detail-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --success: #27ae60;
  --danger: #e74c3c;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  --bg: #f5f6fa;
  font-family: 'Inter', sans-serif;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn { border-radius: 8px; }

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0;
}

.detail-content { display: flex; flex-direction: column; gap: 16px; }

.status-card, .info-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-badge {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.status-badge.pending { background: #f39c12; }
.status-badge.approved { background: var(--success); }
.status-badge.rejected { background: var(--danger); }
.status-badge.waiting { background: #95a5a6; }
.status-badge.cancelled { background: #bdc3c7; }

.status-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item { font-size: 13px; color: var(--text-light); }

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
}

.rejection-text { color: var(--danger); }

.data-section { margin-top: 16px; }

.data-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 8px;
}

.data-table { border-radius: 8px; }

.timeline-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-approver { font-weight: 500; color: var(--text); }
.timeline-comment { font-size: 13px; color: var(--text-light); }
.timeline-rejection { font-size: 13px; color: var(--danger); }

.action-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 24px 0;
}

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

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.char-warning { color: var(--danger); }
</style>