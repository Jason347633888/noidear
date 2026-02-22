<template>
  <div class="permission-audit-log">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="用户">
          <el-input
            v-model="filterForm.username"
            placeholder="用户名"
            clearable
            style="width: 160px"
          />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select
            v-model="filterForm.action"
            clearable
            placeholder="全部"
            style="width: 140px"
          >
            <el-option value="grant" label="授予权限" />
            <el-option value="revoke" label="撤销权限" />
            <el-option value="role_assign" label="角色分配" />
            <el-option value="role_remove" label="角色移除" />
            <el-option value="dept_config" label="部门配置" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="handleExport">导出</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>权限审计日志</span>
          <el-tag type="info">共 {{ pagination.total }} 条记录</el-tag>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="120">
          <template #default="{ row }">
            {{ row.operator?.name || row.operator?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120">
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action)" size="small">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetUser" label="目标用户/部门" width="150">
          <template #default="{ row }">
            {{ row.targetUser?.name || row.targetDept?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="resource" label="资源" width="130">
          <template #default="{ row }">
            {{ row.resource ? getResourceLabel(row.resource) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="permissionAction" label="权限操作" width="100">
          <template #default="{ row }">
            {{ row.permissionAction ? getPermActionLabel(row.permissionAction) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="result" label="结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
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
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import request from '@/api/request';
import { RESOURCE_LABELS } from '@/constants/permission';

interface AuditLog {
  id: string;
  createdAt: string;
  operator: { id: string; name: string; username: string } | null;
  action: string;
  targetUser: { id: string; name: string } | null;
  targetDept: { id: string; name: string } | null;
  resource: string | null;
  permissionAction: string | null;
  detail: string;
  result: 'success' | 'failure';
}


const ACTION_LABELS: Record<string, string> = {
  grant: '授予权限',
  revoke: '撤销权限',
  role_assign: '角色分配',
  role_remove: '角色移除',
  dept_config: '部门配置',
};

const PERM_ACTION_LABELS: Record<string, string> = {
  create: '创建',
  read: '查看',
  update: '编辑',
  delete: '删除',
  approve: '审批',
  export: '导出',
};

const getResourceLabel = (r: string) => RESOURCE_LABELS[r] ?? r;
const getActionLabel = (a: string) => ACTION_LABELS[a] ?? a;
const getPermActionLabel = (a: string) => PERM_ACTION_LABELS[a] ?? a;

const getActionTagType = (action: string): string => {
  if (action === 'grant' || action === 'role_assign') return 'success';
  if (action === 'revoke' || action === 'role_remove') return 'danger';
  return 'info';
};

const formatDate = (date: string): string =>
  dayjs(date).format('YYYY-MM-DD HH:mm:ss');

const loading = ref(false);
const tableData = ref<AuditLog[]>([]);

const filterForm = reactive({
  username: '',
  action: '',
  dateRange: null as [string, string] | null,
});

const pagination = reactive({ page: 1, limit: 20, total: 0 });

const fetchData = async () => {
  loading.value = true;
  try {
    const params: Record<string, unknown> = {
      page: pagination.page,
      limit: pagination.limit,
    };
    if (filterForm.username) params.username = filterForm.username;
    if (filterForm.action) params.action = filterForm.action;
    if (filterForm.dateRange) {
      params.startDate = filterForm.dateRange[0];
      params.endDate = filterForm.dateRange[1];
    }

    const res = await request.get<{ list: AuditLog[]; total: number }>(
      '/permission-audit-logs',
      { params },
    );
    tableData.value = res.list;
    pagination.total = res.total;
  } catch {
    ElMessage.error('获取审计日志失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.username = '';
  filterForm.action = '';
  filterForm.dateRange = null;
  handleSearch();
};

const handleExport = async () => {
  try {
    const params: Record<string, unknown> = {};
    if (filterForm.username) params.username = filterForm.username;
    if (filterForm.action) params.action = filterForm.action;
    if (filterForm.dateRange) {
      params.startDate = filterForm.dateRange[0];
      params.endDate = filterForm.dateRange[1];
    }
    const res = await request.get<Blob>('/permission-audit-logs/export', {
      params,
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res as unknown as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `权限审计日志_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch {
    ElMessage.error('导出失败');
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.permission-audit-log {
  padding: 0;
}

.filter-card {
  margin-bottom: 16px;
}

.table-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
