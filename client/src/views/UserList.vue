<template>
  <div class="user-page">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <p class="page-subtitle">管理系统用户账户和权限</p>
    </div>

    <el-card class="filter-card">
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item label="关键词" class="filter-item">
          <el-input v-model="filterForm.keyword" placeholder="搜索用户名/姓名" clearable class="filter-input" />
        </el-form-item>
        <el-form-item label="角色" class="filter-item">
          <el-select v-model="filterForm.role" clearable placeholder="全部" class="filter-select">
            <el-option value="admin" label="管理员" />
            <el-option value="leader" label="部门负责人" />
            <el-option value="user" label="普通用户" />
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
          <el-button type="primary" @click="showCreateDialog = true" class="create-btn">
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
        <el-table-column prop="department" label="部门" width="150">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.department?.name || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" effect="light" size="small" class="role-tag">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" effect="plain" size="small">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
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
              <el-button link type="primary" @click="handleEdit(row)" class="action-btn">
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
          <el-select v-model="createForm.departmentId" placeholder="请选择部门" filterable class="full-select">
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" placeholder="请选择角色" class="full-select">
            <el-option value="user" label="普通用户" />
            <el-option value="leader" label="部门负责人" />
            <el-option value="admin" label="管理员" />
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
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import { Search, RefreshRight, Plus, Edit, Key } from '@element-plus/icons-vue';

interface User { id: string; username: string; name: string; role: string; status: string; department: { name: string } | null; createdAt: string; }
interface Department { id: string; name: string; }

const loading = ref(false);
const creating = ref(false);
const showCreateDialog = ref(false);
const editingUser = ref<User | null>(null);
const tableData = ref<User[]>([]);
const departments = ref<Department[]>([]);
const createFormRef = ref();

const filterForm = reactive({ keyword: '', role: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const createForm = reactive({ username: '', name: '', password: '', departmentId: '', role: 'user' });
const createRules = { username: [{ required: true, message: '请输入用户名', trigger: 'blur' }], name: [{ required: true, message: '请输入姓名', trigger: 'blur' }], password: [{ required: true, min: 6, message: '密码长度不能少于6位', trigger: 'blur' }], departmentId: [{ required: true, message: '请选择部门', trigger: 'change' }], role: [{ required: true, message: '请选择角色', trigger: 'change' }] };

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');
const getRoleType = (role: string) => ({ admin: 'danger', leader: 'warning', user: 'info' }[role] || 'info');
const getRoleText = (role: string) => ({ admin: '管理员', leader: '部门负责人', user: '普通用户' }[role] || role);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: User[]; total: number }>('/users', { params: { ...filterForm, page: pagination.page, limit: pagination.limit } });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch { ElMessage.error('获取用户列表失败'); }
  finally { loading.value = false; }
};

const fetchDepartments = async () => {
  try {
    const res = await request.get<{ list: Department[] }>('/departments', { params: { limit: 100 } });
    departments.value = res.list || [];
  } catch {}
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.keyword = ''; filterForm.role = ''; pagination.page = 1; fetchData(); };

const handleEdit = (row: User) => {
  editingUser.value = row;
  createForm.username = row.username;
  createForm.name = row.name;
  createForm.password = '';
  createForm.departmentId = row.department?.id || '';
  createForm.role = row.role;
  showCreateDialog.value = true;
};

const handleResetPwd = async (row: User) => {
  try {
    await request.post(`/users/${row.id}/reset-password`);
    ElMessage.success(`已将 ${row.username} 的密码重置为 12345678`);
  } catch { ElMessage.error('重置密码失败'); }
};

const handleCreate = async () => {
  if (!createFormRef.value) return;
  await createFormRef.value.validate();
  creating.value = true;
  try {
    if (editingUser.value) {
      await request.put(`/users/${editingUser.value.id}`, { name: createForm.name, departmentId: createForm.departmentId, role: createForm.role });
      ElMessage.success('保存成功');
    } else {
      await request.post('/users', createForm);
      ElMessage.success('创建成功');
    }
    closeDialog();
    fetchData();
  } catch { ElMessage.error('操作失败'); }
  finally { creating.value = false; }
};

const closeDialog = () => {
  showCreateDialog.value = false;
  editingUser.value = null;
  createForm.username = '';
  createForm.name = '';
  createForm.password = '';
  createForm.departmentId = '';
  createForm.role = 'user';
};

onMounted(() => { fetchData(); fetchDepartments(); });
</script>

<style scoped>
.user-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  --bg: #f5f6fa;
}

.user-page { font-family: 'Inter', sans-serif; }
.page-header { margin-bottom: 24px; }
.page-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; color: var(--primary); margin: 0 0 4px; }
.page-subtitle { font-size: 14px; color: var(--text-light); margin: 0; }

.filter-card { margin-bottom: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); border: none; }
.filter-form { display: flex; align-items: flex-end; gap: 16px; }
.filter-item { margin-bottom: 0; margin-right: 0; }
.filter-item :deep(.el-form-item__label) { font-size: 13px; color: var(--text-light); }
.filter-input { width: 180px; }
.filter-select { width: 140px; }
.filter-actions { margin-left: auto; }

.table-card { border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title-wrap { display: flex; align-items: baseline; gap: 12px; }
.card-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; color: var(--primary); }
.card-count { font-size: 12px; color: var(--text-light); }
.create-btn { border-radius: 8px; background: linear-gradient(135deg, var(--accent) 0%, #d4af37 100%); border: none; font-weight: 500; }
.create-btn:hover { box-shadow: 0 4px 12px rgba(201, 162, 39, 0.3); }

.user-table :deep(th) { background: #fafafa; font-weight: 500; color: var(--text-light); font-size: 12px; }
.user-info { display: flex; align-items: center; gap: 10px; }
.user-avatar { width: 36px; height: 36px; border-radius: 8px; background: var(--primary); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.username { font-size: 13px; font-weight: 500; color: var(--text); }
.role-tag { border-radius: 6px; }
.time-text { font-size: 12px; color: var(--text-light); }
.action-btns { display: flex; gap: 4px; }
.action-btn { font-size: 12px; display: flex; align-items: center; gap: 4px; }

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.pagination-wrap :deep(.el-pagination) { --el-pagination-font-size: 13px; }

.user-dialog :deep(.el-dialog__header) { padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.user-dialog :deep(.el-dialog__title) { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; }
.full-select { width: 100%; }
</style>
