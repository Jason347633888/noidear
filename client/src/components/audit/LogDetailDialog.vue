<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="600px"
    @close="handleClose"
  >
    <el-descriptions :column="1" border>
      <el-descriptions-item
        v-for="(value, key) in displayData"
        :key="key"
        :label="formatLabel(key)"
      >
        <template v-if="isTimestamp(key)">
          {{ formatDateTime(value) }}
        </template>
        <template v-else-if="isStatus(key)">
          <el-tag :type="getStatusType(value)">{{ value }}</el-tag>
        </template>
        <template v-else-if="isJSON(value)">
          <pre class="json-content">{{ formatJSON(value) }}</pre>
        </template>
        <template v-else>
          {{ value || 'N/A' }}
        </template>
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import dayjs from 'dayjs';

interface Props {
  modelValue: boolean;
  title?: string;
  data: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  title: '日志详情',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const displayData = computed(() => {
  const { ...rest } = props.data;
  return rest;
});

const formatLabel = (key: string) => {
  const labelMap: Record<string, string> = {
    id: 'ID',
    userId: '用户ID',
    username: '用户名',
    action: '操作',
    ipAddress: 'IP地址',
    userAgent: '浏览器',
    location: '位置',
    loginTime: '登录时间',
    logoutTime: '登出时间',
    status: '状态',
    failReason: '失败原因',
    operatorId: '操作人ID',
    operatorName: '操作人',
    targetUserId: '目标用户ID',
    targetUsername: '目标用户',
    beforeValue: '变更前',
    afterValue: '变更后',
    reason: '原因',
    approvedBy: '审批人ID',
    approvedByName: '审批人',
    resourceType: '资源类型',
    resourceId: '资源ID',
    resourceName: '资源名称',
    details: '详情',
    createdAt: '创建时间',
    updatedAt: '更新时间',
  };
  return labelMap[key] || key;
};

const isTimestamp = (key: string) => {
  return ['loginTime', 'logoutTime', 'createdAt', 'updatedAt'].includes(key);
};

const isStatus = (key: string) => {
  return key === 'status';
};

const isJSON = (value: any) => {
  return typeof value === 'object' && value !== null;
};

const formatDateTime = (value: string) => {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
};

const getStatusType = (value: string) => {
  const typeMap: Record<string, any> = {
    success: 'success',
    failed: 'danger',
    pending: 'warning',
    completed: 'success',
  };
  return typeMap[value] || 'info';
};

const formatJSON = (value: any) => {
  return JSON.stringify(value, null, 2);
};

const handleClose = () => {
  visible.value = false;
};
</script>

<style scoped>
.json-content {
  background: var(--el-fill-color-light);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
}
</style>
