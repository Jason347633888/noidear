<template>
  <div class="role-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="角色名称">
          <el-input v-model="filterForm.keyword" placeholder="搜索角色名称或代码" clearable />
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
          <span>角色列表</span>
          <el-button type="primary" @click="handleCreate">
            创建角色
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="code" label="角色代码" width="150" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handlePermissions(row)">
              权限配置
            </el-button>
            <el-button link type="primary" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDelete(row)"
            >
              删除
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

    <!-- 创建/编辑对话框 -->
    <RoleForm
      v-model:visible="formVisible"
      :role="currentRole"
      @success="handleSuccess"
    />

    <!-- 权限配置对话框 -->
    <RolePermissions
      v-model:visible="permissionsVisible"
      :role="currentRole"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';
import RoleForm from '@/components/role/RoleForm.vue';
import RolePermissions from '@/components/role/RolePermissions.vue';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
}

const loading = ref(false);
const tableData = ref<Role[]>([]);
const formVisible = ref(false);
const permissionsVisible = ref(false);
const currentRole = ref<Role | null>(null);

const filterForm = reactive({
  keyword: '',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const formatDate = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN');
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: Role[]; total: number }>('/roles', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        keyword: filterForm.keyword || undefined,
      },
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取角色列表失败');
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
  handleSearch();
};

const handleCreate = () => {
  currentRole.value = null;
  formVisible.value = true;
};

const handleEdit = (row: Role) => {
  currentRole.value = row;
  formVisible.value = true;
};

const handlePermissions = (row: Role) => {
  currentRole.value = row;
  permissionsVisible.value = true;
};

const handleDelete = async (row: Role) => {
  try {
    await ElMessageBox.confirm('确定要删除该角色吗？此操作不可恢复。', '警告', {
      type: 'warning',
    });
    await request.delete(`/roles/${row.id}`);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    // 用户取消或删除失败（错误信息已由拦截器处理）
  }
};

const handleSuccess = () => {
  fetchData();
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.role-list {
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
