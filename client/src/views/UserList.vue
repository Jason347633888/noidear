<template>
  <div class="user-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="搜索用户名/姓名" clearable />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filterForm.role" clearable placeholder="全部">
            <el-option value="admin" label="管理员" />
            <el-option value="leader" label="部门负责人" />
            <el-option value="user" label="普通用户" />
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
          <span>用户列表</span>
          <el-button type="primary" @click="showCreateDialog = true">新增用户</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="department" label="部门" width="150">
          <template #default="{ row }">{{ row.department?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)">{{ getRoleText(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleResetPwd(row)">重置密码</el-button>
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

    <el-dialog v-model="showCreateDialog" title="新增用户" width="500px">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="createForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="部门" prop="departmentId">
          <el-select v-model="createForm.departmentId" placeholder="请选择部门" filterable>
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" placeholder="请选择角色">
            <el-option value="user" label="普通用户" />
            <el-option value="leader" label="部门负责人" />
            <el-option value="admin" label="管理员" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

interface User { id: string; username: string; name: string; role: string; status: string; department: { name: string } | null; createdAt: string; }
interface Department { id: string; name: string; }

const loading = ref(false);
const creating = ref(false);
const showCreateDialog = ref(false);
const tableData = ref<User[]>([]);
const departments = ref<Department[]>([]);
const createFormRef = ref();

const filterForm = reactive({ keyword: '', role: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const createForm = reactive({ username: '', name: '', password: '', departmentId: '', role: 'user' });
const createRules = { username: [{ required: true }], name: [{ required: true }], password: [{ required: true, min: 6 }], departmentId: [{ required: true }], role: [{ required: true }] };

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
    departments.value = res.list;
  } catch {}
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.keyword = ''; filterForm.role = ''; handleSearch(); };
const handleEdit = (row: User) => { /* TODO: 编辑用户 */ };
const handleResetPwd = async (row: User) => { /* TODO: 重置密码 */ };
const handleCreate = async () => {
  if (!createFormRef.value) return;
  await createFormRef.value.validate();
  creating.value = true;
  try {
    await request.post('/users', createForm);
    ElMessage.success('创建成功');
    showCreateDialog.value = false;
    fetchData();
  } catch {} finally { creating.value = false; }
};

onMounted(() => { fetchData(); fetchDepartments(); });
</script>

<style scoped>
.user-list { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
