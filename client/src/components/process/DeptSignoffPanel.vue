<template>
  <div class="signoff-panel">
    <el-table :data="approvalList" border size="small">
      <el-table-column label="部门" prop="department" width="120" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">{{ roleText(row.role) }}</template>
      </el-table-column>
      <el-table-column label="签署人" width="120">
        <template #default="{ row }">
          {{ row.approver?.name ?? (row.status === 'PENDING' ? '待签署' : '-') }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="意见" prop="comment" min-width="160" />
      <el-table-column label="时间" width="120">
        <template #default="{ row }">{{ row.signedAt ? row.signedAt.slice(0, 10) : '-' }}</template>
      </el-table-column>
      <el-table-column v-if="!disabled" label="操作" width="150">
        <template #default="{ row }">
          <div v-if="row.status === 'PENDING'" class="row-actions">
            <el-button link type="success" @click="handleSign(row.role, 'approve')">同意</el-button>
            <el-button link type="danger" @click="handleSign(row.role, 'reject')">驳回</el-button>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!disabled" class="sign-action">
      <el-input v-model="comment" placeholder="审批意见（可选）" style="width: 300px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { processApi, type ProcessStepApproval } from '@/api/process';

const props = defineProps<{
  instanceId: string;
  stepNumber: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{ (e: 'signed'): void }>();

const approvalList = ref<ProcessStepApproval[]>([]);
const comment = ref('');

const statusType = (s: string) => ({ APPROVED: 'success', REJECTED: 'danger', PENDING: 'info' }[s] ?? 'info');
const statusText = (s: string) => ({ APPROVED: '已同意', REJECTED: '已驳回', PENDING: '待签署' }[s] ?? s);
const roleText = (r: string) => ({
  gm: '总经理',
  manager: '研发经理',
  quality: '品质部',
  manufacture: '制造部',
  purchase: '采购部',
  development: '产品开发部',
  food_safety_leader: '食品安全组长',
}[r] ?? r);

const load = async () => {
  const res = await processApi.getApprovals(props.instanceId, props.stepNumber);
  approvalList.value = Array.isArray(res) ? res : (res as any).data ?? [];
};

const handleSign = async (role: string, action: 'approve' | 'reject') => {
  try {
    await processApi.submitApproval(props.instanceId, props.stepNumber, {
      action,
      comment: comment.value,
      role,
    });
    await load();
    emit('signed');
    ElMessage.success(action === 'approve' ? '已同意' : '已驳回');
  } catch {
    ElMessage.error('签署失败');
  }
};

onMounted(load);
</script>

<style scoped>
.signoff-panel { margin-top: 12px; }
.sign-action { display: flex; align-items: center; margin-top: 12px; gap: 8px; }
.row-actions { display: flex; gap: 8px; }
</style>
