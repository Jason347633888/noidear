<template>
  <div class="department-page">
    <PageHeaderBlock eyebrow="系统治理" title="部门管理" description="管理组织架构与部门负责人" />

    <el-card class="filter-card">
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item label="关键词" class="filter-item">
          <el-input v-model="filterForm.keyword" placeholder="搜索部门名称/编码" clearable class="filter-input" />
        </el-form-item>
        <el-form-item label="状态" class="filter-item">
          <el-select v-model="filterForm.status" clearable placeholder="全部" class="filter-select">
            <el-option value="active" label="启用" />
            <el-option value="inactive" label="停用" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item filter-actions">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">部门列表</span>
            <span class="card-count">共 {{ filteredDepartments.length }} 个部门</span>
          </div>
          <el-button type="primary" @click="openCreate" class="create-btn">
            新增部门
          </el-button>
        </div>
      </template>

      <el-table :data="filteredDepartments" v-loading="loading" stripe class="dept-table">
        <el-table-column prop="code" label="部门编码" width="140" />
        <el-table-column prop="name" label="部门名称" min-width="180" />
        <el-table-column label="负责人" min-width="200">
          <template #default="{ row }">
            <span>{{ formatManager(row) }}</span>
            <el-tag
              v-if="getManagerIssue(row)"
              type="danger"
              size="small"
              class="ml-4"
            >{{ getManagerIssue(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" effect="plain" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用人数" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="goToDepartmentUsers(row)">
              {{ getActiveUserCount(row.id) }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingDepartment ? '编辑部门' : '新增部门'"
      width="480px"
      class="dept-dialog"
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="部门编码" prop="code">
          <el-input
            v-model="form.code"
            placeholder="请输入部门编码（如 QA）"
            :disabled="!!editingDepartment"
          />
        </el-form-item>
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="状态" prop="status" v-if="editingDepartment">
          <el-select v-model="form.status" class="full-select">
            <el-option value="active" label="启用" />
            <el-option value="inactive" label="停用" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="managerId">
          <el-select
            v-model="form.managerId"
            :placeholder="managerCandidates.length === 0 ? '暂无空闲负责人候选，可稍后设置' : '请选择负责人（可选）'"
            filterable
            clearable
            class="full-select"
          >
            <el-option
              v-for="user in managerCandidates"
              :key="user.id"
              :label="`${user.name}（${user.username}）`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="saving">
          {{ editingDepartment ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import { createDepartment, updateDepartment } from '@/api/department';
import type { Department } from '@noidear/types';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

interface UserItem {
  id: string;
  username: string;
  name: string;
  status: 'active' | 'inactive';
  roleObj?: { id: string; code: string; name: string } | null;
  departmentId: string | null;
  deletedAt?: string | null;
}

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editingDepartment = ref<Department | null>(null);
const departments = ref<Department[]>([]);
const users = ref<UserItem[]>([]);
const formRef = ref();

const filterForm = reactive({
  keyword: '',
  status: '' as '' | 'active' | 'inactive',
  managerIssueOnly: false,
});

const form = reactive({
  code: '',
  name: '',
  managerId: '',
  status: 'active' as 'active' | 'inactive',
});

const formRules = {
  code: [{ required: true, message: '请输入部门编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
};

const managerCandidates = computed(() => {
  const occupied = new Set(
    departments.value
      .filter((dept) => dept.managerId && dept.id !== editingDepartment.value?.id)
      .map((dept) => dept.managerId),
  );

  return users.value.filter((user) => {
    if (user.deletedAt) return false;
    if (user.status !== 'active') return false;
    if (user.roleObj?.code !== 'leader') return false;
    if (occupied.has(user.id)) return false;
    return true;
  });
});

const filteredDepartments = computed(() => {
  return departments.value.filter((dept) => {
    if (filterForm.keyword) {
      const kw = filterForm.keyword.toLowerCase();
      if (!dept.name.toLowerCase().includes(kw) && !dept.code.toLowerCase().includes(kw)) return false;
    }
    if (filterForm.status && dept.status !== filterForm.status) return false;
    return true;
  });
});

const getManagerIssue = (department: Department) => {
  if (department.status !== 'active') return '';
  if (!department.managerId) return '无负责人';
  if (!department.manager) return '负责人已删除';
  if (department.manager.status !== 'active') return '负责人已停用';
  if (department.manager.roleObj?.code !== 'leader') return '负责人不是 leader';
  return '';
};

const formatManager = (department: Department) => {
  if (!department.manager) return '未设置';
  return `${department.manager.name}（${department.manager.username}）`;
};

const getActiveUserCount = (departmentId: string) => {
  return users.value.filter(
    (user) => !user.deletedAt && user.status === 'active' && user.departmentId === departmentId,
  ).length;
};

const goToDepartmentUsers = (department: Department) => {
  router.push({
    path: '/users',
    query:
      department.status === 'inactive'
        ? { departmentId: department.id }
        : { departmentId: department.id, status: 'active' },
  });
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: Department[]; total: number }>('/departments', {
      params: { limit: 200 },
    });
    departments.value = res.list || [];
  } catch {
    ElMessage.error('获取部门列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchUsers = async () => {
  try {
    const res = await request.get<{ list: UserItem[]; total: number }>('/users', {
      params: { limit: 500, status: 'active' },
    });
    users.value = res.list || [];
  } catch {}
};

const handleSearch = () => fetchData();
const handleReset = () => {
  filterForm.keyword = '';
  filterForm.status = '';
  filterForm.managerIssueOnly = false;
};

const openCreate = () => {
  editingDepartment.value = null;
  form.code = '';
  form.name = '';
  form.managerId = '';
  dialogVisible.value = true;
};

const handleEdit = (department: Department) => {
  editingDepartment.value = department;
  form.code = department.code;
  form.name = department.name;
  form.managerId = department.managerId || '';
  form.status = department.status as 'active' | 'inactive';
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  await formRef.value?.validate();

  const payload = {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    managerId: form.managerId || undefined,
  };

  saving.value = true;
  try {
    if (editingDepartment.value) {
      await updateDepartment(editingDepartment.value.id, {
        name: payload.name,
        managerId: payload.managerId ?? null,
        status: form.status,
      });
      ElMessage.success('保存成功');
    } else {
      const newDept = await createDepartment(payload);
      if (payload.managerId) {
        const managerUser = users.value.find((item) => item.id === payload.managerId);
        if (managerUser && !managerUser.departmentId) {
          await request.put(`/users/${managerUser.id}`, {
            departmentId: newDept.id,
            roleId: managerUser.roleObj?.id,
            name: managerUser.name,
          });
        }
      }
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    await Promise.all([fetchData(), fetchUsers()]);
  } catch {
    ElMessage.error('操作失败');
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchData(), fetchUsers()]);
});
</script>

<style scoped>
.department-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.filter-card { border-radius: 12px; }
.filter-form { display: flex; align-items: flex-end; gap: 16px; }
.filter-item { margin-bottom: 0; margin-right: 0; }
.filter-input { width: 180px; }
.filter-select { width: 140px; }
.filter-actions { margin-left: auto; }
.full-select { width: 100%; }
</style>
