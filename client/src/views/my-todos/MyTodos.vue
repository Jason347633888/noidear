<template>
  <div class="my-todos-page">
    <section class="app-page-header">
      <div class="app-page-header__copy">
        <p class="app-page-header__eyebrow">执行收件箱</p>
        <h1 class="app-page-header__title">我的待办</h1>
        <p class="app-page-header__description">优先清理到期和高风险事项，再处理普通协同任务。</p>
      </div>
      <div class="app-page-header__actions">
        <el-button plain @click="router.push('/dashboard')">返回工作台</el-button>
      </div>
    </section>

    <section class="app-panel todo-filters-panel">
      <el-row :gutter="12" class="filter-row">
        <el-col :span="8">
          <el-select v-model="query.status" @change="resetAndFetch">
            <el-option label="全部" value="all" />
            <el-option label="待处理" value="pending" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select v-model="query.type" @change="resetAndFetch">
            <el-option label="全部类型" value="all" />
            <el-option label="培训参加" value="training_attend" />
            <el-option label="培训组织" value="training_organize" />
            <el-option label="审批" value="approval" />
            <el-option label="内审整改" value="audit_rectification" />
            <el-option label="设备维护" value="equipment_maintain" />
            <el-option label="盘点" value="inventory" />
            <el-option label="变更请求" value="change_request" />
          </el-select>
        </el-col>
      </el-row>
    </section>

    <section class="app-panel todo-table-panel">
      <TodoTable
        :items="items"
        :loading="loading"
        :completing="completing"
        @complete="handleComplete"
        @goto="handleGoto"
      />
    </section>

    <el-pagination
      v-if="total > 0"
      class="pagination"
      background
      layout="total, prev, pager, next"
      :total="total"
      :page-size="query.limit"
      :current-page="query.page"
      @current-change="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { todoApi } from '@/api/todo';
import { useTodoStore } from '@/stores/todo';
import TodoTable from './TodoTable.vue';
import type { TodoItem, TodoListQuery } from '@/types/todo';

const router = useRouter();
const todoStore = useTodoStore();

const loading = ref(false);
const completing = ref<string | null>(null);
const items = ref<TodoItem[]>([]);
const total = ref(0);

const query = reactive<Required<TodoListQuery>>({
  status: 'all',
  type: 'all',
  page: 1,
  limit: 20,
});

async function fetchList() {
  loading.value = true;
  try {
    const res = await todoApi.list(query);
    items.value = res.items;
    total.value = res.total;
  } catch {
    ElMessage.error('获取待办列表失败');
  } finally {
    loading.value = false;
  }
}

function resetAndFetch() {
  query.page = 1;
  fetchList();
}

function handlePageChange(page: number) {
  query.page = page;
  fetchList();
}

async function handleComplete(row: TodoItem) {
  completing.value = row.id;
  try {
    await todoApi.complete(row.id);
    ElMessage.success('已完成');
    await Promise.all([fetchList(), todoStore.refreshPendingCount()]);
  } catch {
    ElMessage.error('操作失败，请重试');
  } finally {
    completing.value = null;
  }
}

function handleGoto(row: TodoItem) {
  if (row.actionRoute) {
    router.push(row.actionRoute);
  }
}

onMounted(() => {
  fetchList();
  todoStore.refreshPendingCount();
});
</script>

<style scoped>
.my-todos-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.todo-filters-panel {
  padding: 16px 20px;
}

.todo-table-panel {
  padding: 0;
  overflow: hidden;
}

.filter-row {
  align-items: center;
}

.pagination {
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
