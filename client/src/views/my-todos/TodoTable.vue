<template>
  <div v-loading="loading" class="todo-table">
    <div v-if="items.length" class="todo-list">
      <div v-for="row in items" :key="row.id" class="todo-row">
        <div class="todo-row__main">
          <strong class="todo-row__title">{{ row.title }}</strong>
          <p class="todo-row__desc">{{ row.description || '进入处理页查看更多上下文。' }}</p>
        </div>
        <div class="todo-row__meta">
          <el-tag size="small" effect="plain">{{ todoTypeLabels[row.type] ?? row.type }}</el-tag>
          <el-tag :type="priorityTagTypes[row.priority]" size="small">
            {{ priorityText[row.priority] }}
          </el-tag>
          <span class="todo-row__due">{{ formatDueLabel(row.dueDate) }}</span>
        </div>
        <div class="todo-row__actions">
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
        </div>
      </div>
    </div>
    <div v-else class="todo-empty">暂无待办</div>
  </div>
</template>

<script setup lang="ts">
import type { TodoItem } from '@/types/todo';
import {
  todoTypeLabels,
  priorityTagTypes,
  priorityText,
  formatDueLabel,
} from '@/utils/todoPresentation';

defineProps<{ items: TodoItem[]; loading: boolean; completing: string | null }>();
const emit = defineEmits<{ complete: [row: TodoItem]; goto: [row: TodoItem] }>();
</script>

<style scoped>
.todo-table {
  min-height: 100px;
}

.todo-list {
  display: flex;
  flex-direction: column;
}

.todo-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--shell-border, rgba(31, 35, 40, 0.08));
}

.todo-row:last-child {
  border-bottom: none;
}

.todo-row__main {
  flex: 1;
  min-width: 0;
}

.todo-row__title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.todo-row__desc {
  font-size: 13px;
  color: var(--shell-muted, #66707a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-row__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.todo-row__due {
  font-size: 12px;
  color: var(--shell-muted, #66707a);
}

.todo-row__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.todo-empty {
  padding: 40px;
  text-align: center;
  color: var(--shell-muted, #66707a);
}
</style>
