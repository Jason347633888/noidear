<template>
  <div class="role-list">
    <PageHeaderBlock eyebrow="系统治理" title="角色管理" />
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

    <div class="app-panel table-card">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">角色列表</h3>
      </div>
      <div class="app-panel--padded">

      <el-alert
        v-if="missingSystemRoles.length"
        type="warning"
        show-icon
        :closable="false"
        :title="`初始化未完成：缺少系统角色 ${missingSystemRoles.join('、')}`"
        description="请先恢复系统角色，初始化主流程依赖 admin、leader、user 三个系统角色。"
        style="margin-bottom: 16px"
      />

      <el-table :data="sortedRoles" v-loading="loading" stripe>
        <el-table-column prop="code" label="角色代码" width="150" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-tag v-if="isSystemRole(row)" size="small" effect="plain">系统内置</el-tag>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import { toList, toTotal } from '@/utils/apiResponse';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
}

const SYSTEM_ROLE_CODES = ['admin', 'leader', 'user'];

const loading = ref(false);
const tableData = ref<Role[]>([]);

const sortedRoles = computed(() => {
  const weight = new Map(SYSTEM_ROLE_CODES.map((code, index) => [code, index]));
  return [...tableData.value].sort((a, b) => {
    const aWeight = weight.has(a.code) ? weight.get(a.code)! : 99;
    const bWeight = weight.has(b.code) ? weight.get(b.code)! : 99;
    if (aWeight !== bWeight) return aWeight - bWeight;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

const missingSystemRoles = computed(() =>
  SYSTEM_ROLE_CODES.filter((code) => !tableData.value.some((role) => role.code === code)),
);

const isSystemRole = (role: Role) => SYSTEM_ROLE_CODES.includes(role.code);

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
    tableData.value = toList(res);
    pagination.total = toTotal(res);
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

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.role-list {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  margin-bottom: 16px;
}

.table-card {
  margin-bottom: 16px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
