<template>
  <div class="user-permissions-manager">
    <PageHeaderBlock eyebrow="系统治理" title="用户权限管理" />
    <el-card class="filter-card">
      <template #header>
        <div class="card-header">
          <span>用户权限管理</span>
          <el-button type="primary" @click="openGrantDialog">授予权限</el-button>
        </div>
      </template>
      <el-form :model="filterForm" inline>
        <el-form-item label="搜索用户">
          <el-input
            v-model="filterForm.keyword"
            placeholder="用户名/姓名"
            style="width: 180px"
            clearable
            @input="handleSearch"
          />
        </el-form-item>
        <el-form-item label="权限编码">
          <el-input
            v-model="filterForm.permissionCode"
            placeholder="权限编码"
            style="width: 180px"
            clearable
            @input="handleSearch"
          />
        </el-form-item>
        <el-form-item label="资源类型">
          <el-select v-model="filterForm.resource" clearable placeholder="全部" style="width: 150px" @change="handleSearch">
            <el-option value="document" label="文档管理" />
            <el-option value="template" label="模板管理" />
            <el-option value="task" label="任务管理" />
            <el-option value="approval" label="审批管理" />
            <el-option value="user" label="用户管理" />
            <el-option value="role" label="角色管理" />
            <el-option value="permission" label="权限管理" />
            <el-option value="warehouse" label="仓库管理" />
            <el-option value="record" label="记录管理" />
            <el-option value="workflow" label="工作流管理" />
            <el-option value="batch" label="批次管理" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="用户" width="160">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="user-avatar">{{ row.user?.name?.charAt(0) || 'U' }}</div>
              <div>
                <div class="user-name">{{ row.user?.name || '-' }}</div>
                <div class="user-username">{{ row.user?.username || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="权限编码" width="200">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.permissionCode || `${row.resource}:${row.action}` }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="资源类型" width="130">
          <template #default="{ row }">
            {{ getResourceLabel(row.resource) }}
          </template>
        </el-table-column>
        <el-table-column label="操作类型" width="100">
          <template #default="{ row }">
            {{ getActionLabel(row.action) }}
          </template>
        </el-table-column>
        <el-table-column label="授权原因" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.reason || row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="过期时间" width="160">
          <template #default="{ row }">
            <span v-if="row.expiresAt" :class="{ 'text-danger': isExpired(row.expiresAt) }">
              {{ formatDate(row.expiresAt) }}
            </span>
            <span v-else class="text-muted">永不过期</span>
          </template>
        </el-table-column>
        <el-table-column label="授权时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="handleRevoke(row)">撤销</el-button>
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

    <GrantPermissionDialog
      v-model:visible="grantDialogVisible"
      @success="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';
import GrantPermissionDialog from '@/components/permission/GrantPermissionDialog.vue';

interface UserPermissionRecord {
  id: string;
  userId: string;
  user?: { id: string; name: string; username: string };
  permissionCode?: string;
  resource: string;
  action: string;
  reason?: string;
  description?: string;
  expiresAt?: string;
  createdAt: string;
}

const loading = ref(false);
const tableData = ref<UserPermissionRecord[]>([]);
const grantDialogVisible = ref(false);

const filterForm = reactive({
  keyword: '',
  permissionCode: '',
  resource: '',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const getResourceLabel = (resource: string): string => {
  const map: Record<string, string> = {
    document: '文档管理',
    template: '模板管理',
    task: '任务管理',
    approval: '审批管理',
    user: '用户管理',
    role: '角色管理',
    permission: '权限管理',
    warehouse: '仓库管理',
    record: '记录管理',
    workflow: '工作流管理',
    batch: '批次管理',
  };
  return map[resource] || resource;
};

const getActionLabel = (action: string): string => {
  const map: Record<string, string> = {
    create: '创建',
    read: '查看',
    update: '编辑',
    delete: '删除',
    approve: '审批',
    export: '导出',
  };
  return map[action] || action;
};

const isExpired = (expiresAt: string): boolean => new Date(expiresAt) < new Date();

const formatDate = (date?: string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: UserPermissionRecord[]; total: number }>('/user-permissions', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        keyword: filterForm.keyword || undefined,
        permissionCode: filterForm.permissionCode || undefined,
        resource: filterForm.resource || undefined,
      },
    });
    tableData.value = res.list ?? res ?? [];
    pagination.total = res.total ?? (Array.isArray(res) ? (res as any[]).length : 0);
  } catch {
    ElMessage.error('获取用户权限列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.keyword = '';
  filterForm.permissionCode = '';
  filterForm.resource = '';
  handleSearch();
};

const openGrantDialog = () => {
  grantDialogVisible.value = true;
};

const handleRevoke = async (row: UserPermissionRecord) => {
  try {
    await ElMessageBox.confirm(
      `确定要撤销用户 "${row.user?.name || row.userId}" 的权限 "${row.permissionCode || `${row.resource}:${row.action}`}" 吗？`,
      '警告',
      { type: 'warning' },
    );
    await request.delete(`/user-permissions/${row.id}`);
    ElMessage.success('权限撤销成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.user-permissions-manager { padding: 0; }
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.user-cell { display: flex; align-items: center; gap: 8px; }
.user-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  background: linear-gradient(135deg, #c9a227, #d4af37);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 13px; flex-shrink: 0;
}
.user-name { font-weight: 500; font-size: 14px; }
.user-username { font-size: 12px; color: #909399; }
.text-muted { color: #909399; }
.text-danger { color: #f56c6c; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
