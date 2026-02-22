<template>
  <div class="todo-list-page">
    <el-card class="statistics-card">
      <div class="statistics" v-if="statistics">
        <el-statistic title="待办总数" :value="statistics.total" />
        <el-statistic title="待处理" :value="statistics.pending" />
        <el-statistic title="已完成" :value="statistics.completed" />
        <el-statistic
          title="已逾期"
          :value="statistics.overdue"
          :value-style="{ color: statistics.overdue > 0 ? '#f56c6c' : '#67c23a' }"
        />
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>我的待办</span>
        </div>
      </template>

      <!-- 筛选区域 -->
      <el-form :model="filterForm" :inline="true" class="filter-form">
        <el-form-item label="类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable>
            <el-option label="组织培训" value="training_organize" />
            <el-option label="参加培训" value="training_attend" />
            <el-option label="审批待办" value="approval" />
            <el-option label="设备维护" value="equipment_maintain" />
            <el-option label="库存盘点" value="inventory" />
            <el-option label="变更申请" value="change_request" />
            <el-option label="内审整改" value="audit_rectification" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="已完成" value="completed" />
            <el-option label="已逾期" value="overdue" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级">
          <el-select v-model="filterForm.priority" placeholder="全部优先级" clearable>
            <el-option label="低" value="low" />
            <el-option label="普通" value="normal" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>

        <el-form-item label="排序">
          <el-select v-model="filterForm.sortBy" placeholder="排序方式">
            <el-option label="截止日期" value="dueDate" />
            <el-option label="优先级" value="priority" />
            <el-option label="创建时间" value="createdAt" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 待办列表 -->
      <div v-loading="loading" class="todo-list">
        <TodoCard
          v-for="todo in todos"
          :key="todo.id"
          :todo="todo"
          @complete="handleComplete"
          @delete="handleDelete"
          @click="handleTodoClick"
        />

        <el-empty v-if="todos.length === 0" description="暂无待办任务" />
      </div>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getTodoTasks, completeTodoTask, deleteTodoTask, getTodoStatistics } from '@/api/todo';
import TodoCard from '@/components/todo/TodoCard.vue';
import type { TodoTask, TodoStatistics, TodoTaskQueryDto } from '@/types/training';

const router = useRouter();
const loading = ref(false);
const todos = ref<TodoTask[]>([]);
const statistics = ref<TodoStatistics | null>(null);

const filterForm = reactive({
  type: '',
  status: '',
  priority: '',
  sortBy: 'dueDate',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const fetchData = async () => {
  loading.value = true;
  try {
    const params: TodoTaskQueryDto = {
      page: pagination.page,
      limit: pagination.limit,
      type: filterForm.type as any,
      status: filterForm.status as any,
      priority: filterForm.priority as any,
      sortBy: filterForm.sortBy as any,
      sortOrder: 'asc',
    };

    const res = await getTodoTasks(params);
    todos.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    ElMessage.error(error.message || '获取待办列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchStatistics = async () => {
  try {
    statistics.value = await getTodoStatistics();
  } catch (error: any) {
    ElMessage.error(error.message || '获取统计数据失败');
  }
};

const handleComplete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要完成该待办任务吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    });

    await completeTodoTask(id);
    ElMessage.success('已完成');
    await Promise.all([fetchData(), fetchStatistics()]);
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
};

const handleDelete = async (id: string) => {
  // P1-5: 只允许删除待处理状态的待办任务
  const todo = todos.value.find(t => t.id === id);
  if (todo && todo.status !== 'pending') {
    ElMessage.warning('只能删除待处理状态的待办任务');
    return;
  }

  try {
    await ElMessageBox.confirm('确定要删除该待办任务吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await deleteTodoTask(id);
    ElMessage.success('删除成功');
    await Promise.all([fetchData(), fetchStatistics()]);
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const handleTodoClick = async (todo: TodoTask) => {
  // P1-8: 添加路由跳转错误处理
  try {
    if (todo.type === 'training_organize' || todo.type === 'training_attend') {
      await router.push(`/training/projects/${todo.relatedId}`);
    } else if (todo.type === 'approval') {
      await router.push(`/approvals/detail/${todo.relatedId}`);
    } else if (todo.type === 'audit_rectification') {
      const target = todo.relatedId
        ? `/internal-audit/rectifications`
        : '/internal-audit/rectifications';
      await router.push(target);
    } else {
      ElMessage.warning('暂不支持该类型待办的详情查看');
    }
  } catch (error: any) {
    ElMessage.error(error.message || '页面跳转失败');
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.type = '';
  filterForm.status = '';
  filterForm.priority = '';
  filterForm.sortBy = 'dueDate';
  handleSearch();
};

onMounted(async () => {
  await Promise.all([fetchData(), fetchStatistics()]);
});
</script>

<style scoped>
.todo-list-page {
  padding: 20px;
}

.statistics-card {
  margin-bottom: 20px;
}

.statistics {
  display: flex;
  justify-content: space-around;
  gap: 40px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-form {
  margin-bottom: 20px;
}

.todo-list {
  min-height: 400px;
}
</style>
