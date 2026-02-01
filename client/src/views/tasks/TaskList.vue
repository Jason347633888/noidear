<template>
  <div class="task-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="pending" label="进行中" />
            <el-option value="completed" label="已完成" />
            <el-option value="cancelled" label="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
          <el-button type="primary" @click="$router.push('/tasks/create')" v-if="isAdmin">
            创建任务
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="任务ID" width="220" show-overflow-tooltip />
        <el-table-column prop="template.title" label="模板" min-width="150" />
        <el-table-column prop="department.name" label="部门" width="120" />
        <el-table-column prop="deadline" label="截止日期" width="120">
          <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="100">
          <template #default="{ row }">{{ row.creator?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button
              v-if="row.status === 'pending'"
              link
              type="warning"
              @click="handleCancel(row)"
              v-if="isAdmin"
            >
              取消
            </el-button>
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
const handleReset = () => { filterForm.status = ''; handleSearch(); };
const handleView = (row: Task) => router.push(`/tasks/${row.id}`);
const handleCancel = async (row: Task) => {
  try {
    await ElMessageBox.confirm('确定要取消该任务吗？', '提示');
    await request.post(`/tasks/${row.id}/cancel`);
    ElMessage.success('已取消');
    fetchData();
  } catch {}
};

onMounted(() => fetchData());
</script>

<style scoped>
.task-list { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
