<template>
  <div class="permission-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="资源类型">
          <el-select v-model="filterForm.resource" clearable placeholder="全部">
            <el-option value="document" label="文档管理" />
            <el-option value="template" label="模板管理" />
            <el-option value="task" label="任务管理" />
            <el-option value="approval" label="审批管理" />
            <el-option value="user" label="用户管理" />
            <el-option value="role" label="角色管理" />
            <el-option value="permission" label="权限管理" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filterForm.action" clearable placeholder="全部">
            <el-option value="create" label="创建" />
            <el-option value="read" label="查看" />
            <el-option value="update" label="编辑" />
            <el-option value="delete" label="删除" />
            <el-option value="approve" label="审批" />
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
          <span>权限列表</span>
          <div class="header-actions">
            <el-switch
              v-model="groupByResource"
              active-text="分组展示"
              inactive-text="列表展示"
              style="margin-right: 16px"
            />
            <el-button type="primary" @click="handleCreate">
              创建权限
            </el-button>
          </div>
        </div>
      </template>

      <!-- 分组展示 -->
      <el-collapse v-if="groupByResource" v-model="activeGroups" v-loading="loading">
        <el-collapse-item
          v-for="(group, resource) in groupedData"
          :key="resource"
          :name="resource"
        >
          <template #title>
            <div class="collapse-title">
              <span class="resource-label">{{ getResourceLabel(resource) }}</span>
              <el-badge :value="group.length" type="info" class="group-badge" />
            </div>
          </template>
          <el-table :data="group" stripe>
            <el-table-column prop="action" label="操作类型" width="120">
              <template #default="{ row }">
                {{ getActionLabel(row.action) }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
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
        </el-collapse-item>
      </el-collapse>

      <!-- 列表展示 -->
      <el-table v-else :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="resource" label="资源类型" width="150">
          <template #default="{ row }">
            {{ getResourceLabel(row.resource) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作类型" width="120">
          <template #default="{ row }">
            {{ getActionLabel(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
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
    <PermissionForm
      v-model:visible="formVisible"
      :permission="currentPermission"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';
import PermissionForm from '@/components/permission/PermissionForm.vue';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
  createdAt: string;
}

const loading = ref(false);
const tableData = ref<Permission[]>([]);
const formVisible = ref(false);
const currentPermission = ref<Permission | null>(null);
const groupByResource = ref(false);
const activeGroups = ref<string[]>([]);

const groupedData = computed(() => {
  const groups: Record<string, Permission[]> = {};
  tableData.value.forEach((permission) => {
    if (!groups[permission.resource]) {
      groups[permission.resource] = [];
    }
    groups[permission.resource].push(permission);
  });
  return groups;
});

const filterForm = reactive({
  resource: '',
  action: '',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const formatDate = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN');
};

const getResourceLabel = (resource: string): string => {
  const map: Record<string, string> = {
    document: '文档管理',
    template: '模板管理',
    task: '任务管理',
    approval: '审批管理',
    user: '用户管理',
    role: '角色管理',
    permission: '权限管理',
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
  };
  return map[action] || action;
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: Permission[]; total: number }>('/permissions', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        resource: filterForm.resource || undefined,
        action: filterForm.action || undefined,
      },
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取权限列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.resource = '';
  filterForm.action = '';
  handleSearch();
};

const handleCreate = () => {
  currentPermission.value = null;
  formVisible.value = true;
};

const handleEdit = (row: Permission) => {
  currentPermission.value = row;
  formVisible.value = true;
};

const handleDelete = async (row: Permission) => {
  try {
    await ElMessageBox.confirm('确定要删除该权限吗？此操作不可恢复。', '警告', {
      type: 'warning',
    });
    await request.delete(`/permissions/${row.id}`);
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
.permission-list {
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

.header-actions {
  display: flex;
  align-items: center;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.resource-label {
  font-weight: 500;
  font-size: 15px;
}

.group-badge {
  margin-left: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
