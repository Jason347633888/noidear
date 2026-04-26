<template>
  <div class="approval-task-panel">
    <el-empty v-if="!approvalInstanceId" description="等待提交" />
    <template v-else>
      <el-table :data="tasks" border size="small">
        <el-table-column prop="stepName" label="审批环节" min-width="150" />
        <el-table-column label="指派" min-width="160">
          <template #default="{ row }">
            {{ row.assigneeRoleCode || row.assigneeDepartmentId || row.assigneePermissionCode || row.assigneeUserId || '候选人' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'"
              size="small"
            >
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="comment" label="意见" min-width="160" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING' && !disabled">
              <el-button link type="success" @click="act(row.id, 'approve')">同意</el-button>
              <el-button link type="danger" @click="act(row.id, 'reject')">驳回</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <el-input
        v-if="!disabled"
        v-model="comment"
        class="approval-comment"
        placeholder="审批意见（驳回时必填）"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { ElMessage } from 'element-plus';
import { unifiedApprovalApi, type ApprovalTask } from '@/api/unified-approval';

const props = defineProps<{ approvalInstanceId?: string; disabled?: boolean }>();
const emit = defineEmits<{ (e: 'signed'): void }>();
const tasks = ref<ApprovalTask[]>([]);
const comment = ref('');

function statusText(status: string) {
  return (
    ({ PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回', CANCELLED: '已取消' } as Record<string, string>)[status] ?? status
  );
}

async function load() {
  if (!props.approvalInstanceId) {
    tasks.value = [];
    return;
  }
  try {
    const instance = await unifiedApprovalApi.getInstance(props.approvalInstanceId);
    tasks.value = (instance as any).tasks ?? [];
  } catch {
    tasks.value = [];
  }
}

async function act(taskId: string, action: 'approve' | 'reject') {
  try {
    if (action === 'approve') {
      await unifiedApprovalApi.approveTask(taskId, { comment: comment.value });
    } else {
      if (!comment.value.trim()) {
        ElMessage.warning('驳回需填写意见');
        return;
      }
      await unifiedApprovalApi.rejectTask(taskId, { comment: comment.value });
    }
    await load();
    emit('signed');
  } catch {
    ElMessage.error('审批操作失败');
  }
}

watchEffect(load);
</script>

<style scoped>
.approval-task-panel { margin-top: 12px; }
.approval-comment { margin-top: 12px; max-width: 400px; }
</style>
