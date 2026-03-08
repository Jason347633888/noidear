<template>
  <div class="approval-step-field">
    <!-- Pending: waiting for submission -->
    <el-tag v-if="stepStatus === 'PENDING'" type="info">待提交</el-tag>

    <!-- Submitted: show approve/reject buttons for authorized users -->
    <div v-else-if="stepStatus === 'SUBMITTED'">
      <el-tag type="warning" style="margin-bottom:8px">待审批</el-tag>
      <div v-if="canApprove">
        <el-input
          v-model="comment"
          type="textarea"
          :rows="2"
          placeholder="审批意见（可选）"
          style="margin-bottom:8px"
        />
        <el-button type="success" @click="$emit('approve', comment)">通过</el-button>
        <el-button type="danger" @click="$emit('reject', comment)" style="margin-left:8px">驳回</el-button>
      </div>
      <el-tag v-else type="warning">等待审批中</el-tag>
    </div>

    <!-- Approved -->
    <div v-else-if="stepStatus === 'APPROVED'">
      <el-tag type="success">已通过</el-tag>
      <span v-if="approvalComment" style="margin-left:8px;color:var(--el-text-color-secondary)">
        {{ approvalComment }}
      </span>
    </div>

    <!-- Rejected -->
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
import type { FieldConfig } from './DynamicField.vue';

const props = defineProps<{
  modelValue?: any;
  field: FieldConfig;
  stepStatus?: string;
  approvalComment?: string;
}>();

defineEmits<{
  (e: 'approve', comment: string): void;
  (e: 'reject', comment: string): void;
}>();

const comment = ref('');
const userStore = useUserStore();

const canApprove = computed(() => {
  const allowed = props.field.approverRoles as string[] | undefined;
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(userStore.user?.role ?? '');
});
</script>
