<template>
  <div class="user-page">
    <PageHeaderBlock eyebrow="系统治理" title="用户管理" description="管理系统用户账户和权限" />

    <el-alert
      v-if="missingSystemRoles.length"
      type="warning"
      show-icon
      :closable="false"
      :title="`初始化未完成：缺少系统角色 ${missingSystemRoles.join('、')}`"
      description="请先到角色管理恢复系统角色，当前仍可浏览列表，但新增和编辑已被阻塞。"
      class="bootstrap-alert"
    />

    <el-card class="filter-card">
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item label="关键词" class="filter-item">
          <el-input v-model="filterForm.keyword" placeholder="搜索用户名/姓名" clearable class="filter-input" />
        </el-form-item>
        <el-form-item label="部门" class="filter-item">
          <el-select v-model="filterForm.departmentId" clearable placeholder="全部" class="filter-select">
            <el-option label="未分配部门" value="unassigned" />
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" class="filter-item">
          <el-select v-model="filterForm.roleCode" clearable placeholder="全部" class="filter-select">
            <el-option v-for="role in systemRoles" :key="role.id" :label="role.name" :value="role.code" />
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
            <span class="card-title">用户列表</span>
            <span class="card-count">共 {{ pagination.total }} 个用户</span>
          </div>
          <el-button type="primary" :disabled="userEditingBlocked" @click="showCreateDialog = true" class="create-btn">
            <el-icon><Plus /></el-icon>新增用户
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe class="user-table">
        <el-table-column prop="username" label="用户名" width="150">
          <template #default="{ row }">
            <div class="user-info">
              <div class="user-avatar">{{ row.name?.charAt(0) || 'U' }}</div>
              <span class="username">{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column label="部门" width="180">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ departmentDisplay(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="140">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.roleObj?.code || row.role)" effect="light" size="small" class="role-tag">
              {{ roleDisplay(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" effect="plain" size="small">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
            <el-tag v-if="isBootstrapIncomplete(row)" type="warning" size="small" class="ml-4">待完善</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" :disabled="userEditingBlocked" @click="handleEdit(row)" class="action-btn">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
              <el-button link type="warning" @click="handleResetPwd(row)" class="action-btn">
                <el-icon><Key /></el-icon>重置密码
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

    <!-- Create/Edit Dialog -->
    <el-dialog v-model="showCreateDialog" :title="editingUser ? '编辑用户' : '新增用户'" width="500px" class="user-dialog">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createForm.username" placeholder="请输入用户名" :disabled="!!editingUser" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!editingUser">
          <el-input v-model="createForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="部门" prop="departmentId">
          <el-select v-model="createForm.departmentId" placeholder="初始化阶段可暂不分配部门" clearable filterable class="full-select">
            <el-option
              v-for="dept in departments.filter((item) => item.status !== 'inactive' || item.id === createForm.departmentId)"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="createForm.roleId" placeholder="请选择角色" class="full-select">
            <el-option v-for="role in systemRoles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">{{ editingUser ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useBootstrapStore } from '@/stores/bootstrap';
import request from '@/api/request';
import { Search, RefreshRight, Plus, Edit, Key } from '@element-plus/icons-vue';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

interface RoleRef {
  id: string;
  code: string;
  name: string;
}

interface DepartmentRef {
  id: string;
  name: string;
  status?: 'active' | 'inactive';
}

interface UserRow {
  id: string;
  username: string;
  name: string;
  roleId: string | null;
  roleObj?: RoleRef | null;
  role?: string;
  status: 'active' | 'inactive';
  departmentId: string | null;
  department?: DepartmentRef | null;
  createdAt: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  managerId: string | null;
}

const route = useRoute();
const router = useRouter();
const bootstrapStore = useBootstrapStore();
const loading = ref(false);
const creating = ref(false);
const showCreateDialog = ref(false);
const editingUser = ref<UserRow | null>(null);
const tableData = ref<UserRow[]>([]);
const departments = ref<DepartmentItem[]>([]);
const systemRoles = ref<RoleRef[]>([]);
const missingSystemRoles = ref<string[]>([]);
const userEditingBlocked = computed(() => missingSystemRoles.value.length > 0);
const createFormRef = ref();

const filterForm = reactive({
  keyword: '',
  roleCode: '',
  departmentId: '',
  status: '',
});
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const createForm = reactive({
  username: '',
  name: '',
  password: '',
  departmentId: null as string | null,
  roleId: '' as string,
});
const createRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, min: 6, message: '密码长度不能少于6位', trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
};

const departmentMap = computed(() => new Map(departments.value.map((item) => [item.id, item])));
const managerDepartmentMap = computed(() => {
  const map = new Map<string, string>();
  departments.value.forEach((dept) => {
    if (dept.managerId) map.set(dept.managerId, dept.id);
  });
  return map;
});

const isManager = (user: UserRow) => managerDepartmentMap.value.has(user.id);

const isBootstrapIncomplete = (user: UserRow) => {
  if (user.status !== 'active') return false;
  if (!user.departmentId) return true;
  const department = departmentMap.value.get(user.departmentId);
  return department?.status === 'inactive';
};

const canChangeRoleForManager = (user: Partial<UserRow>, nextRoleCode: string) => {
  if (!user.id || !managerDepartmentMap.value.has(user.id)) return true;
  return nextRoleCode === 'leader';
};

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');
const getRoleType = (code?: string) =>
  ({ admin: 'danger', leader: 'warning', user: 'info' } as Record<string, string>)[code || ''] || 'info';
const roleDisplay = (row: UserRow) =>
  row.roleObj?.name ||
  ({ admin: '管理员', leader: '部门负责人', user: '普通用户' } as Record<string, string>)[row.role || ''] ||
  '未知角色';

const departmentDisplay = (row: UserRow) => {
  if (!row.departmentId) return '未分配部门';
  const dept = departmentMap.value.get(row.departmentId);
  if (!dept) return row.department?.name || '未知部门';
  return dept.status === 'inactive' ? `${dept.name}（已停用）` : dept.name;
};

const loadSystemRoles = async () => {
  const res = await request.get<{ list: RoleRef[]; total: number; page: number; limit: number }>('/roles', {
    params: { page: 1, limit: 100 },
  });
  const order = ['admin', 'leader', 'user'];
  systemRoles.value = (res.list || [])
    .filter((item) => order.includes(item.code))
    .sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  missingSystemRoles.value = order.filter((code) => !systemRoles.value.some((item) => item.code === code));
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params: Record<string, unknown> = {
      keyword: filterForm.keyword || undefined,
      page: pagination.page,
      limit: pagination.limit,
    };
    if (filterForm.roleCode) params.role = filterForm.roleCode;
    if (filterForm.departmentId) params.departmentId = filterForm.departmentId;
    if (filterForm.status) params.status = filterForm.status;
    const res = await request.get<{ list: UserRow[]; total: number }>('/users', { params });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch {
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchDepartments = async () => {
  try {
    const res = await request.get<{ list: DepartmentItem[] }>('/departments', { params: { limit: 200 } });
    departments.value = res.list || [];
  } catch {}
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};
const handleReset = () => {
  filterForm.keyword = '';
  filterForm.roleCode = '';
  filterForm.departmentId = '';
  filterForm.status = '';
  pagination.page = 1;
  fetchData();
};

const handleEdit = (row: UserRow) => {
  editingUser.value = row;
  createForm.username = row.username;
  createForm.name = row.name;
  createForm.password = '';
  createForm.departmentId = row.departmentId || null;
  createForm.roleId = row.roleId || '';
  showCreateDialog.value = true;
};

const handleResetPwd = async (row: UserRow) => {
  try {
    await request.post(`/users/${row.id}/reset-password`);
    ElMessage.success(`已将 ${row.username} 的密码重置为 12345678`);
  } catch {
    ElMessage.error('重置密码失败');
  }
};

const handleCreate = async () => {
  if (!createFormRef.value) return;
  await createFormRef.value.validate();

  if (editingUser.value) {
    const nextRole = systemRoles.value.find((item) => item.id === createForm.roleId)?.code || '';
    if (!canChangeRoleForManager(editingUser.value, nextRole)) {
      ElMessage.error('请先在部门管理中更换负责人');
      return;
    }
    if (isManager(editingUser.value) && createForm.departmentId !== editingUser.value.departmentId) {
      ElMessage.error('请先在部门管理中更换负责人');
      return;
    }
  }

  creating.value = true;
  try {
    if (editingUser.value) {
      await request.put(`/users/${editingUser.value.id}`, {
        name: createForm.name,
        departmentId: createForm.departmentId,
        roleId: createForm.roleId,
      });
      ElMessage.success('保存成功');
    } else {
      await request.post('/users', {
        username: createForm.username,
        name: createForm.name,
        password: createForm.password,
        departmentId: createForm.departmentId,
        roleId: createForm.roleId,
      });
      ElMessage.success('创建成功');
    }
    closeDialog();
    await Promise.all([fetchData(), fetchDepartments(), loadSystemRoles()]);
    if (route.query.from === 'bootstrap') {
      await bootstrapStore.refresh();
      await router.push('/bootstrap/org');
    }
  } catch {
    ElMessage.error('操作失败');
  } finally {
    creating.value = false;
  }
};

const closeDialog = () => {
  showCreateDialog.value = false;
  editingUser.value = null;
  createForm.username = '';
  createForm.name = '';
  createForm.password = '';
  createForm.departmentId = null;
  createForm.roleId = '';
};

onMounted(async () => {
  if (route.query.departmentId) filterForm.departmentId = route.query.departmentId as string;
  if (route.query.status) filterForm.status = route.query.status as string;
  await Promise.all([fetchData(), fetchDepartments(), loadSystemRoles()]);
});
</script>

<style scoped>
.user-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Inter', sans-serif;
}

.filter-card { border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); border: none; }
.filter-form { display: flex; align-items: flex-end; gap: 16px; }
.filter-item { margin-bottom: 0; margin-right: 0; }
.filter-item :deep(.el-form-item__label) { font-size: 13px; color: var(--shell-muted); }
.filter-input { width: 180px; }
.filter-select { width: 140px; }
.filter-actions { margin-left: auto; }

.table-card { border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title-wrap { display: flex; align-items: baseline; gap: 12px; }
.card-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; color: var(--shell-ink); }
.card-count { font-size: 12px; color: var(--shell-muted); }
.create-btn { border-radius: 8px; background: linear-gradient(135deg, var(--el-color-primary) 0%, #d4af37 100%); border: none; font-weight: 500; }
.create-btn:hover { box-shadow: 0 4px 12px rgba(201, 162, 39, 0.3); }

.user-table :deep(th) { background: #fafafa; font-weight: 500; color: var(--shell-muted); font-size: 12px; }
.user-info { display: flex; align-items: center; gap: 10px; }
.user-avatar { width: 36px; height: 36px; border-radius: 8px; background: var(--shell-ink); color: var(--el-color-primary); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.username { font-size: 13px; font-weight: 500; color: var(--shell-ink); }
.role-tag { border-radius: 6px; }
.time-text { font-size: 12px; color: var(--shell-muted); }
.action-btns { display: flex; gap: 4px; }
.action-btn { font-size: 12px; display: flex; align-items: center; gap: 4px; }

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.pagination-wrap :deep(.el-pagination) { --el-pagination-font-size: 13px; }

.user-dialog :deep(.el-dialog__header) { padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.user-dialog :deep(.el-dialog__title) { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; }
.full-select { width: 100%; }
</style>
