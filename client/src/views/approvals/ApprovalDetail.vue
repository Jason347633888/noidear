<template>
  <div class="approval-detail-page" v-loading="loading">
    <div class="page-header">
      <el-button @click="router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <h1 class="page-title">{{ task?.stepName ?? '审批详情' }}</h1>
    </div>

    <div class="detail-content" v-if="task">
      <!-- 状态卡片 -->
      <el-card class="status-card">
        <div class="status-header">
          <div class="status-badge" :class="task.status.toLowerCase()">
            {{ STATUS_LABELS[task.status] ?? task.status }}
          </div>
          <div class="status-meta">
            <span class="meta-item">步骤: {{ task.stepKey }}</span>
            <span class="meta-item">创建时间: {{ formatDate(task.createdAt) }}</span>
            <span v-if="task.actedAt" class="meta-item">处理时间: {{ formatDate(task.actedAt) }}</span>
          </div>
        </div>
      </el-card>

      <!-- 关联业务 -->
      <el-card v-if="instance" class="info-card">
        <template #header><span class="card-title">关联业务</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题">{{ instance.title }}</el-descriptions-item>
          <el-descriptions-item label="业务类型">{{ resourceTypeLabel(instance.resourceType) }}</el-descriptions-item>
          <el-descriptions-item label="实例状态">{{ instance.status }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 审批信息 -->
      <el-card class="info-card">
        <template #header><span class="card-title">审批信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="状态">
            <el-tag :type="STATUS_TYPES[task.status] ?? ''" size="small">
              {{ STATUS_LABELS[task.status] ?? task.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审批意见">{{ task.comment ?? '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 操作区（待审批时显示） -->
      <div v-if="task.status === 'PENDING'" class="action-section">
        <el-input
          v-model="comment"
          type="textarea"
          :rows="2"
          placeholder="审批意见（驳回时必填）"
          style="max-width: 480px"
        />
        <div class="action-btns">
          <el-button type="success" size="large" @click="handleApprove" :loading="approving">
            <el-icon><Check /></el-icon>通过
          </el-button>
          <el-button type="danger" size="large" @click="handleReject" :loading="rejecting">
            <el-icon><Close /></el-icon>驳回
          </el-button>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && !task" description="审批记录不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Check, Close } from '@element-plus/icons-vue';
import { unifiedApprovalApi, type ApprovalTask, type ApprovalInstance } from '@/api/unified-approval';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const approving = ref(false);
const rejecting = ref(false);
const task = ref<ApprovalTask | null>(null);
const instance = ref<ApprovalInstance | null>(null);
const comment = ref('');

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELLED: '已取消',
};

const STATUS_TYPES: Record<string, '' | 'success' | 'danger' | 'warning' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'info',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  process_instance: '产品研发',
  document: '文件',
  record: '记录',
  task_record: '任务记录',
  material_requisition: '领料',
  material_inbound: '入库',
  material_return: '退料',
  material_scrap: '报废',
  training_plan: '培训计划',
  maintenance_record: '设备维保',
  audit_finding: '内审整改',
  corrective_action: 'CAPA',
  deviation_report: '偏离报告',
  change_event: '变更',
};

function resourceTypeLabel(type?: string): string {
  return RESOURCE_TYPE_LABELS[type ?? ''] ?? type ?? '-';
}

function formatDate(date?: string): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}

async function load() {
  loading.value = true;
  try {
    const data = await unifiedApprovalApi.getTask(route.params.id as string);
    task.value = data;
    instance.value = (data as ApprovalTask & { instance?: ApprovalInstance }).instance ?? null;
  } catch {
    ElMessage.error('获取审批详情失败');
  } finally {
    loading.value = false;
  }
}

async function handleApprove() {
  if (!task.value) return;
  approving.value = true;
  try {
    await unifiedApprovalApi.approveTask(task.value.id, { comment: comment.value || undefined });
    ElMessage.success('已通过');
    comment.value = '';
    await load();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    approving.value = false;
  }
}

async function handleReject() {
  if (!task.value) return;
  if (!comment.value.trim()) {
    ElMessage.warning('驳回需填写审批意见');
    return;
  }
  rejecting.value = true;
  try {
    await unifiedApprovalApi.rejectTask(task.value.id, { comment: comment.value });
    ElMessage.warning('已驳回');
    comment.value = '';
    await load();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    rejecting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.approval-detail-page {
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
  color: var(--shell-ink);
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
.status-badge.approved { background: var(--shell-success); }
.status-badge.rejected { background: var(--shell-danger); }
.status-badge.cancelled { background: #bdc3c7; }

.status-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item { font-size: 13px; color: var(--shell-muted); }

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 0;
}

.action-btns {
  display: flex;
  gap: 16px;
}
</style>
