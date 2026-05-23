<template>
  <div class="permission-definitions">
    <PageHeaderBlock eyebrow="系统治理" title="权限定义" />
    <el-card class="filter-card">
      <template #header>
        <div class="card-header">
          <span>权限定义列表</span>
          <el-tag type="warning" size="small">仅系统管理员可见</el-tag>
        </div>
      </template>
      <el-form :model="filterForm" inline>
        <el-form-item label="权限编码/名称">
          <el-input
            v-model="filterForm.keyword"
            placeholder="搜索权限"
            style="width: 200px"
            clearable
            @input="handleSearch"
          />
        </el-form-item>
        <el-form-item label="资源分类">
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
            <el-option value="batch" label="批次管理" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作范围">
          <el-select v-model="filterForm.action" clearable placeholder="全部" style="width: 120px" @change="handleSearch">
            <el-option value="create" label="创建" />
            <el-option value="read" label="查看" />
            <el-option value="update" label="编辑" />
            <el-option value="delete" label="删除" />
            <el-option value="approve" label="审批" />
            <el-option value="export" label="导出" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column label="权限编码" width="220">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.resource }}:{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限名称" width="180">
          <template #default="{ row }">
            {{ getResourceLabel(row.resource) }} - {{ getActionLabel(row.action) }}
          </template>
        </el-table-column>
        <el-table-column label="资源分类" width="130">
          <template #default="{ row }">
            <el-tag :type="getCategoryType(row.resource)" size="small">
              {{ getResourceLabel(row.resource) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作范围" width="100">
          <template #default="{ row }">
            {{ getActionLabel(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import { toList, toTotal } from '@/utils/apiResponse';

interface PermissionDef {
  id: string;
  resource: string;
  action: string;
  description: string;
  createdAt: string;
}

const loading = ref(false);
const tableData = ref<PermissionDef[]>([]);

const filterForm = reactive({
  keyword: '',
  resource: '',
  action: '',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const resourceCategoryTypeMap: Record<string, string> = {
  document: 'primary', template: 'success', task: 'warning',
  approval: 'danger', user: 'info', role: 'info',
  permission: 'warning', warehouse: 'success', record: 'primary',
  batch: 'success',
};

const getCategoryType = (resource: string) => resourceCategoryTypeMap[resource] || 'info';

const getResourceLabel = (resource: string): string => {
  const map: Record<string, string> = {
    document: '文档管理', template: '模板管理', task: '任务管理',
    approval: '审批管理', user: '用户管理', role: '角色管理',
    permission: '权限管理', warehouse: '仓库管理', record: '记录管理',
    batch: '批次管理',
  };
  return map[resource] || resource;
};

const getActionLabel = (action: string): string => {
  const map: Record<string, string> = {
    create: '创建', read: '查看', update: '编辑',
    delete: '删除', approve: '审批', export: '导出',
  };
  return map[action] || action;
};

const formatDate = (date: string): string => new Date(date).toLocaleString('zh-CN');

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: PermissionDef[]; total: number }>('/permissions', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        keyword: filterForm.keyword || undefined,
        resource: filterForm.resource || undefined,
        action: filterForm.action || undefined,
      },
    });
    tableData.value = toList(res);
    pagination.total = toTotal(res);
  } catch {
    ElMessage.error('获取权限定义列表失败');
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
  filterForm.resource = '';
  filterForm.action = '';
  handleSearch();
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.permission-definitions { padding: 0; }
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
