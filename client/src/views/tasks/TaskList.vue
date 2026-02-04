<template>
  <div class="task-list-page">
    <div class="page-header">
      <h1 class="page-title">任务列表</h1>
      <p class="page-subtitle">管理并进行中的任务</p>
    </div>

    <el-card class="filter-card">
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item label="状态" class="filter-item">
          <el-select v-model="filterForm.status" clearable placeholder="全部" class="filter-select">
            <el-option value="pending" label="进行中" />
            <el-option value="completed" label="已完成" />
            <el-option value="cancelled" label="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item filter-actions">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">任务列表</span>
            <span class="card-count">共 {{ pagination.total }} 个任务</span>
          </div>
          <el-button type="primary" @click="$router.push('/tasks/create')" v-if="isAdmin" class="create-btn">
            <el-icon><Plus /></el-icon>创建任务
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe class="task-table">
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
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="handleView(row)" class="action-btn">
                <el-icon><View /></el-icon>查看
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
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';
import { useUserStore } from '@/stores/user';
import { Search, RefreshRight, Plus, Document, View, Close } from '@element-plus/icons-vue';

interface Task {
  id: string;
  template: { id: string; title: string };
  department: { id: string; name: string };
  deadline: string;
  status: string;
  creator: { name: string } | null;
  createdAt: string;
}

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const tableData = ref<Task[]>([]);

const isAdmin = computed(() => userStore.isAdmin || userStore.isLeader);
const filterForm = reactive({ status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');
const formatDateTime = (date: string) => new Date(date).toLocaleString('zh-CN');
const isOverdue = (deadline: string, status: string): boolean => {
  if (status === 'completed' || status === 'cancelled') return false;
  return new Date(deadline) < new Date();
};
const getStatusType = (status: string) => ({ pending: 'warning', completed: 'success', cancelled: 'info' }[status] || 'info');
const getStatusText = (status: string) => ({ pending: '进行中', completed: '已完成', cancelled: '已取消' }[status] || status);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: Task[]; total: number }>('/tasks', {
      params: { ...filterForm, page: pagination.page, limit: pagination.limit },
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch { ElMessage.error('获取任务列表失败'); }
  finally { loading.value = false; }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.status = ''; pagination.page = 1; fetchData(); };
const handleView = (row: Task) => router.push(`/tasks/${row.id}`);
const handleCancel = async (row: Task) => {
  try {
    await ElMessageBox.confirm('确定要取消该任务吗？', '确认取消');
    await request.post(`/tasks/${row.id}/cancel`);
    ElMessage.success('已取消');
    fetchData();
  } catch {}
};

onMounted(fetchData);
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

.filter-card {
  margin-bottom: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.filter-form {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

.filter-item {
  margin-bottom: 0;
  margin-right: 0;
}

.filter-item :deep(.el-form-item__label) {
  font-size: 13px;
  color: var(--text-light);
}

.filter-select {
  width: 140px;
}

.filter-actions {
  margin-left: auto;
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

.create-btn {
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #d4af37 100%);
  border: none;
  font-weight: 500;
}

.create-btn:hover {
  box-shadow: 0 4px 12px rgba(201, 162, 39, 0.3);
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

.date-text {
  font-size: 13px;
  color: var(--text);
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
