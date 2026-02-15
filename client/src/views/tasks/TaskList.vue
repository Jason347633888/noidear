<template>
  <div class="task-list-page">
    <div class="page-header">
      <h1 class="page-title">任务列表</h1>
      <p class="page-subtitle">管理并进行中的任务</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">任务列表</span>
            <span class="card-count">共 {{ pagination.total }} 个任务</span>
            <span v-if="selectedTasks.length > 0" class="selected-count">
              已选中 {{ selectedTasks.length }} 个任务
            </span>
          </div>
          <div class="header-actions">
            <el-button
              v-if="selectedTasks.length > 0 && isAdmin"
              type="warning"
              @click="showBatchAssignDialog = true"
            >
              <el-icon><UserFilled /></el-icon>批量分配
            </el-button>
            <el-button @click="handleExport">
              <el-icon><Download /></el-icon>导出任务
            </el-button>
            <el-button type="primary" @click="$router.push('/tasks/create')" v-if="isAdmin" class="create-btn">
              <el-icon><Plus /></el-icon>创建任务
            </el-button>
          </div>
        </div>
      </template>

      <!-- Tab filter replacing dropdown -->
      <el-tabs v-model="activeTab" class="task-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待填报" name="pending" />
        <el-tab-pane label="已提交" name="submitted" />
        <el-tab-pane label="已逾期" name="overdue" />
      </el-tabs>

      <el-table :data="tableData" v-loading="loading" stripe class="task-table" @selection-change="handleSelectionChange">
        <el-table-column v-if="isAdmin" type="selection" width="55" />
        <el-table-column prop="id" label="任务ID" width="220">
          <template #default="{ row }">
            <span class="task-id">{{ row.id.slice(0, 8) }}...</span>
          </template>
        </el-table-column>
        <el-table-column prop="template.title" label="模板" min-width="150">
          <template #default="{ row }">
            <div class="template-info">
              <el-icon class="template-icon"><Document /></el-icon>
              <span>{{ row.template?.title || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="department.name" label="部门" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.department?.name || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" width="140">
          <template #default="{ row }">
            <span :class="{ 'date-overdue': isOverdue(row.deadline, row.status) }">
              {{ formatDate(row.deadline) }}
              <el-tag v-if="isOverdue(row.deadline, row.status)" type="danger" size="small" class="overdue-tag">
                逾期
              </el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light" class="status-tag">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="100">
          <template #default="{ row }">
            <div class="creator-info">
              <div class="creator-avatar">{{ row.creator?.name?.charAt(0) || 'U' }}</div>
              <span>{{ row.creator?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="navigateToTask(row)" class="action-btn">
                <el-icon><View /></el-icon>查看
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                link
                type="success"
                @click="navigateToTask(row)"
                class="action-btn"
              >
                <el-icon><EditPen /></el-icon>立即填报
              </el-button>
              <el-button
                v-if="row.status === 'pending' && isAdmin"
                link
                type="warning"
                @click="handleCancel(row)"
                class="action-btn"
              >
                <el-icon><Close /></el-icon>取消
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 批量分配对话框 -->
    <el-dialog v-model="showBatchAssignDialog" title="批量分配任务" width="500px">
      <el-form :model="batchAssignForm" label-width="100px">
        <el-form-item label="选择部门">
          <el-select v-model="batchAssignForm.departmentId" clearable placeholder="选择部门">
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="batchAssignForm.deadline"
            type="date"
            placeholder="选择截止日期"
            :disabled-date="disablePastDates"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchAssign" :loading="batchAssigning">
          确定分配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Document, View, Close, EditPen, UserFilled, Download } from '@element-plus/icons-vue';
import taskApi, {
  type Task,
  type TaskListResponse,
  isTaskOverdue,
  getTaskStatusText,
  getTaskStatusType,
} from '@/api/task';
import { useUserStore } from '@/stores/user';
import request from '@/api/request';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const tableData = ref<Task[]>([]);
const activeTab = ref('all');
const selectedTasks = ref<Task[]>([]);
const showBatchAssignDialog = ref(false);
const batchAssigning = ref(false);
const departments = ref<Array<{ id: string; name: string }>>([]);

const isAdmin = computed(() => userStore.isAdmin || userStore.isLeader);
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const batchAssignForm = reactive({
  departmentId: '',
  deadline: '',
});

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');
const formatDateTime = (date: string) => new Date(date).toLocaleString('zh-CN');
const isOverdue = (deadline: string, status: string) => isTaskOverdue(deadline, status);
const getStatusType = (status: string) => getTaskStatusType(status);
const getStatusText = (status: string) => getTaskStatusText(status);

const TAB_STATUS_MAP: Record<string, string> = {
  all: '',
  pending: 'pending',
  submitted: 'submitted',
  overdue: 'overdue',
};

const fetchData = async () => {
  loading.value = true;
  try {
    const statusFilter = TAB_STATUS_MAP[activeTab.value] || '';
    const res = await taskApi.getTasks({
      status: statusFilter || undefined,
      page: pagination.page,
      limit: pagination.limit,
    }) as TaskListResponse;
    tableData.value = res.list;
    pagination.total = res.total;
  } catch {
    ElMessage.error('获取任务列表失败');
  } finally {
    loading.value = false;
  }
};

const handleTabChange = () => {
  pagination.page = 1;
  fetchData();
};

const navigateToTask = (row: Task) => router.push(`/tasks/${row.id}`);

const handleCancel = async (row: Task) => {
  try {
    await ElMessageBox.confirm('确定要取消该任务吗？', '确认取消');
  } catch {
    return;
  }
  try {
    await taskApi.cancelTask(row.id);
    ElMessage.success('已取消');
    fetchData();
  } catch {
    ElMessage.error('取消任务失败');
  }
};

const handleSelectionChange = (selection: Task[]) => {
  selectedTasks.value = selection;
};

const fetchDepartments = async () => {
  try {
    const res = await request.get<{ list: Array<{ id: string; name: string }> }>('/departments');
    departments.value = res.list || [];
  } catch {
    // Ignore error
  }
};

const disablePastDates = (time: Date) => {
  return time.getTime() < Date.now() - 86400000; // 24h ago
};

const handleBatchAssign = async () => {
  if (!batchAssignForm.departmentId && !batchAssignForm.deadline) {
    ElMessage.warning('请至少选择部门或截止日期');
    return;
  }

  if (selectedTasks.value.length === 0) {
    ElMessage.warning('请选择要分配的任务');
    return;
  }

  batchAssigning.value = true;
  try {
    await request.post('/tasks/batch-assign', {
      taskIds: selectedTasks.value.map((t) => t.id),
      departmentId: batchAssignForm.departmentId || undefined,
      deadline: batchAssignForm.deadline || undefined,
    });
    ElMessage.success(`成功分配 ${selectedTasks.value.length} 个任务`);
    showBatchAssignDialog.value = false;
    selectedTasks.value = [];
    batchAssignForm.departmentId = '';
    batchAssignForm.deadline = '';
    fetchData();
  } catch {
    ElMessage.error('批量分配失败');
  } finally {
    batchAssigning.value = false;
  }
};

const handleExport = async () => {
  try {
    const statusFilter = TAB_STATUS_MAP[activeTab.value] || '';
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);

    const url = `/tasks/export?${params.toString()}`;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
      headers: {
        Authorization: `Bearer ${userStore.token}`,
      },
    });

    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `tasks_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(downloadUrl);

    ElMessage.success('导出成功');
  } catch {
    ElMessage.error('导出失败');
  }
};

onMounted(() => {
  fetchData();
  if (isAdmin.value) {
    fetchDepartments();
  }
});
</script>

<style scoped>
.task-list-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  --bg: #f5f6fa;
  --white: #ffffff;
}

.task-list-page {
  font-family: 'Inter', sans-serif;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-light);
  margin: 0;
}

.table-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.card-count {
  font-size: 12px;
  color: var(--text-light);
}

.selected-count {
  font-size: 12px;
  color: var(--accent);
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.create-btn {
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #d4af37 100%);
  border: none;
  font-weight: 500;
}

.create-btn:hover {
  box-shadow: 0 4px 12px rgba(201, 162, 39, 0.3);
}

.task-tabs {
  margin-bottom: 16px;
}

.task-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #f0f0f0;
}

.task-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--accent);
}

.task-tabs :deep(.el-tabs__item.is-active) {
  color: var(--accent);
  font-weight: 600;
}

.task-tabs :deep(.el-tabs__item:hover) {
  color: var(--accent);
}

.task-table {
  --el-table-border-color: #f0f0f0;
  --el-table-row-hover-bg-color: #fafafa;
}

.task-table :deep(th) {
  background: #fafafa;
  font-weight: 500;
  color: var(--text-light);
  font-size: 12px;
}

.task-id {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: var(--text-light);
}

.template-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-icon {
  color: var(--accent);
}

.date-overdue {
  color: #f56c6c;
  font-weight: 500;
}

.overdue-tag {
  margin-left: 4px;
}

.time-text {
  font-size: 12px;
  color: var(--text-light);
}

.status-tag {
  border-radius: 6px;
  font-size: 12px;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.creator-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--primary);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.action-btns {
  display: flex;
  gap: 8px;
}

.action-btn {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.pagination-wrap :deep(.el-pagination) {
  --el-pagination-font-size: 13px;
}
</style>
