<template>
  <div :class="['todo-card', { overdue: todo.isOverdue && todo.status === 'pending' }]">
    <div class="todo-header">
      <el-tag :type="getTypeColor(todo.type)" size="small">{{ getTypeText(todo.type) }}</el-tag>
      <el-tag :type="getPriorityColor(todo.priority)" size="small">
        {{ getPriorityText(todo.priority) }}
      </el-tag>
      <el-tag :type="todo.status === 'completed' ? 'success' : 'info'" size="small">
        {{ todo.status === 'completed' ? '已完成' : '待处理' }}
      </el-tag>
    </div>

    <div class="todo-title" @click="handleClick">{{ todo.title }}</div>

    <div class="todo-description" v-if="todo.description">
      {{ todo.description }}
    </div>

    <div class="todo-footer">
      <div class="todo-date">
        <el-icon><Calendar /></el-icon>
        <span v-if="todo.dueDate">
          截止: {{ formatDate(todo.dueDate) }}
          <span v-if="todo.isOverdue && todo.status === 'pending'" class="overdue-text">
            (已逾期)
          </span>
        </span>
        <span v-else>无截止日期</span>
      </div>

      <div class="todo-actions">
        <el-button
          link
          type="success"
          size="small"
          @click.stop="handleComplete"
          v-if="todo.status === 'pending'"
        >
          完成
        </el-button>
        <el-button link type="danger" size="small" @click.stop="handleDelete">
          删除
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Calendar } from '@element-plus/icons-vue';
import type { TodoTask } from '@/types/training';
import dayjs from 'dayjs';

interface Props {
  todo: TodoTask;
}

interface Emits {
  (e: 'complete', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'click', todo: TodoTask): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    training_organize: '组织培训',
    training_attend: '参加培训',
    approval: '审批待办',
    equipment_maintain: '设备维护',
    inventory: '库存盘点',
    change_request: '变更申请',
    audit_rectification: '内审整改',
  };
  return typeMap[type] || type;
};

const getTypeColor = (type: string) => {
  const colorMap: Record<string, any> = {
    training_organize: 'primary',
    training_attend: 'success',
    approval: 'warning',
    equipment_maintain: 'danger',
    inventory: 'info',
    change_request: '',
    audit_rectification: 'danger',
  };
  return colorMap[type] || '';
};

const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急',
  };
  return priorityMap[priority] || priority;
};

const getPriorityColor = (priority: string) => {
  const colorMap: Record<string, any> = {
    low: 'info',
    normal: '',
    high: 'warning',
    urgent: 'danger',
  };
  return colorMap[priority] || '';
};

const handleComplete = () => {
  emit('complete', props.todo.id);
};

const handleDelete = () => {
  emit('delete', props.todo.id);
};

const handleClick = () => {
  emit('click', props.todo);
};
</script>

<style scoped>
.todo-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background-color: #fff;
  transition: all 0.3s;
}

.todo-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.todo-card.overdue {
  background-color: #fef0f0;
  border-color: #f56c6c;
  border-width: 2px;
  box-shadow: 0 2px 8px 0 rgba(245, 108, 108, 0.3);
}

.todo-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.todo-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  cursor: pointer;
}

.todo-title:hover {
  color: #409eff;
}

.todo-description {
  font-size: 14px;
  color: #909399;
  margin-bottom: 12px;
  line-height: 1.6;
}

.todo-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f2f6fc;
}

.todo-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.overdue-text {
  color: #f56c6c;
  font-weight: bold;
}

.todo-actions {
  display: flex;
  gap: 8px;
}
</style>
