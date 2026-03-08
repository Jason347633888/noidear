<template>
  <div class="approval-panel">
    <el-tag v-if="stepStatus === 'PENDING' || !stepStatus" type="info">待提交</el-tag>

    <div v-else-if="stepStatus === 'SUBMITTED'">
      <el-tag type="warning" style="margin-bottom:8px">待 HACCP 小组审批</el-tag>
      <div v-if="canApprove && !disabled">
        <el-input v-model="comment" type="textarea" :rows="2"
          placeholder="审批意见（可选）" style="margin-bottom:8px" />
        <el-button type="success" @click="$emit('approve', comment)">通过</el-button>
        <el-button type="danger" @click="$emit('reject', comment)" style="margin-left:8px">
          驳回
        </el-button>
      </div>
      <el-tag v-else type="warning">等待 HACCP 小组审批中</el-tag>
    </div>

    <div v-else-if="stepStatus === 'APPROVED'">
      <el-tag type="success">审批通过</el-tag>
      <span v-if="approvalComment" style="margin-left:8px;color:var(--el-text-color-secondary)">
        {{ approvalComment }}
      </span>
    </div>

    <div v-else>
      <el-tag type="danger">已驳回</el-tag>
      <span v-if="approvalComment" style="margin-left:8px;color:var(--el-color-danger)">
        {{ approvalComment }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user';

const props = defineProps<{
  stepStatus?: string;
  approvalComment?: string;
  disabled?: boolean;
}>();

defineEmits<{
  (e: 'approve', comment: string): void;
  (e: 'reject', comment: string): void;
}>();

const comment = ref('');
const userStore = useUserStore();

const canApprove = computed(() => {
  const role = userStore.user?.role ?? '';
  return role === 'admin' || role === 'HACCP' || role === 'manager';
});
</script>
