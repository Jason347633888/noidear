<template>
  <el-table v-loading="loading" :data="items" empty-text="暂无待办">
    <el-table-column label="标题" prop="title" min-width="200" />
    <el-table-column label="类型" width="130">
      <template #default="{ row }">
        <el-tag size="small">{{ TYPE_LABELS[row.type as TodoType] ?? row.type }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="优先级" width="90">
      <template #default="{ row }">
        <el-tag :type="PRIORITY_TYPES[row.priority]" size="small">
          {{ PRIORITY_LABELS[row.priority] ?? row.priority }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="截止日期" width="120">
      <template #default="{ row }">{{ row.dueDate ? row.dueDate.slice(0, 10) : '—' }}</template>
    </el-table-column>
    <el-table-column label="创建时间" width="120">
      <template #default="{ row }">{{ row.createdAt.slice(0, 10) }}</template>
    </el-table-column>
    <el-table-column label="状态" width="90">
      <template #default="{ row }">
        <el-tag :type="row.status === 'pending' ? 'warning' : 'success'" size="small">
          {{ row.status === 'pending' ? '待处理' : '已完成' }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="160" fixed="right">
      <template #default="{ row }">
        <el-button
          v-if="row.status === 'pending' && row.type !== 'approval_task'"
          type="primary"
          size="small"
          :loading="completing === row.id"
          @click="emit('complete', row)"
        >完成</el-button>
        <el-tooltip :content="row.actionRoute ? '前往处理' : '暂不支持跳转'" placement="top">
          <span>
            <el-button size="small" :disabled="!row.actionRoute" @click="emit('goto', row)">
              跳转
            </el-button>
          </span>
        </el-tooltip>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import type { TodoItem, TodoType } from '@/types/todo';

defineProps<{ items: TodoItem[]; loading: boolean; completing: string | null }>();
const emit = defineEmits<{ complete: [row: TodoItem]; goto: [row: TodoItem] }>();

const TYPE_LABELS: Record<TodoType, string> = {
  training_attend: '培训参加',
  training_organize: '培训组织',
  approval: '审批',
  audit_rectification: '内审整改',
  equipment_maintain: '设备维护',
  inventory: '盘点',
  change_request: '变更请求',
  approval_task: '审批',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: '低', normal: '普通', high: '高', urgent: '紧急',
};

const PRIORITY_TYPES: Record<string, '' | 'info' | 'warning' | 'danger'> = {
  low: 'info', normal: '', high: 'warning', urgent: 'danger',
};
</script>
