<template>
  <div class="approval-page">
    <PageHeaderBlock
      eyebrow="工作执行"
      title="待我审批"
      description="处理待审批的任务记录和文档申请"
    />

    <div class="app-panel table-card">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">
          待审批列表
          <el-badge v-if="tasks.length" :value="tasks.length" :max="99" class="approval-badge" />
        </h3>
      </div>

      <el-table
        v-if="loading || tasks.length"
        :data="tasks"
        v-loading="loading"
        stripe
        class="approval-table"
        row-key="id"
      >
        <el-table-column label="审批事项" min-width="200">
          <template #default="{ row }">
            <span class="doc-title">{{ row.stepName ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关联业务" min-width="200">
          <template #default="{ row }">
            <span>{{ row.instance?.title ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="业务类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ resourceTypeLabel(row.instance?.resourceType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="router.push(`/approvals/detail/${row.id}`)" class="action-btn">
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

      <el-empty v-if="!loading && !tasks.length" description="暂无待审批记录" :image-size="120" />
    </div>

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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { View, Check, Close, Warning } from '@element-plus/icons-vue';
import { unifiedApprovalApi, type ApprovalTask, type ApprovalInstance } from '@/api/unified-approval';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const router = useRouter();
const loading = ref(false);
const approving = ref(false);
const rejecting = ref(false);
const tasks = ref<(ApprovalTask & { instance?: ApprovalInstance })[]>([]);
const showApproveDialog = ref(false);
const showRejectDialog = ref(false);
const approveComment = ref('');
const rejectReason = ref('');
const currentTask = ref<ApprovalTask | null>(null);

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
    tasks.value = await unifiedApprovalApi.myPending();
  } catch {
    ElMessage.error('获取待审批列表失败');
  } finally {
    loading.value = false;
  }
}

function handleApprove(row: ApprovalTask) {
  currentTask.value = row;
  approveComment.value = '';
  showApproveDialog.value = true;
}

async function confirmApprove() {
  if (!currentTask.value) return;
  approving.value = true;
  try {
    await unifiedApprovalApi.approveTask(currentTask.value.id, { comment: approveComment.value || undefined });
    ElMessage.success('已通过');
    showApproveDialog.value = false;
    await load();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    approving.value = false;
  }
}

function handleReject(row: ApprovalTask) {
  currentTask.value = row;
  rejectReason.value = '';
  showRejectDialog.value = true;
}

async function confirmReject() {
  if (!currentTask.value) return;
  if (rejectReason.value.trim().length < 10) {
    ElMessage.warning('驳回原因至少10个字符');
    return;
  }
  rejecting.value = true;
  try {
    await unifiedApprovalApi.rejectTask(currentTask.value.id, { comment: rejectReason.value });
    ElMessage.success('已驳回');
    showRejectDialog.value = false;
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
.approval-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card { overflow: hidden; }

.approval-badge :deep(.el-badge__content) { background: var(--shell-danger); }

.approval-table :deep(th) {
  background: #fafafa;
  font-weight: 500;
  color: var(--shell-muted);
  font-size: 12px;
}

.doc-title { font-size: 14px; color: var(--shell-ink); font-weight: 500; }

.time-text { font-size: 12px; color: var(--shell-muted); }

.action-btns { display: flex; gap: 4px; }

.action-btn { font-size: 12px; display: flex; align-items: center; gap: 4px; }

.reject-dialog :deep(.el-dialog__header) { padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }

.reject-content { padding: 8px 0; }

.reject-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--shell-danger);
}

.reject-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(180, 35, 24, 0.1);
  border-radius: 6px;
}

.reject-input :deep(.el-textarea__inner) { border-radius: 8px; resize: none; }

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--shell-muted);
  margin-top: 4px;
}

.char-warning { color: var(--shell-danger); }

.approve-content p {
  font-size: 14px;
  color: var(--shell-ink);
  margin-bottom: 12px;
}

.approve-input :deep(.el-textarea__inner) { border-radius: 8px; resize: none; }
</style>
