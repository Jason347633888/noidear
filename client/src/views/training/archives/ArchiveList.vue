<template>
  <div class="archive-list">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="部门">
          <el-select v-model="filters.departmentId" clearable placeholder="全部部门">
            <el-option label="全部" :value="null" />
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="年度">
          <el-date-picker
            v-model="filters.year"
            type="year"
            placeholder="选择年度"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchArchives">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table
        v-loading="loading"
        :data="archives"
        @row-click="handleRowClick"
        style="cursor: pointer"
      >
        <el-table-column prop="projectTitle" label="培训标题" min-width="300" />
        <el-table-column prop="departmentName" label="部门" width="150" />
        <el-table-column prop="trainingDate" label="培训日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.trainingDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="生成时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click.stop="downloadArchive(row.id)"
            >
              下载PDF
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="fetchArchives"
        @size-change="fetchArchives"
        style="margin-top: 20px"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

const router = useRouter();

const filters = ref({
  departmentId: null as string | null,
  year: null as Date | null,
});

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
});

const archives = ref<any[]>([]);
const departments = ref<any[]>([]);
const loading = ref(false);

const fetchArchives = async () => {
  try {
    loading.value = true;
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    };

    if (filters.value.departmentId) {
      params.departmentId = filters.value.departmentId;
    }

    if (filters.value.year) {
      params.year = filters.value.year.getFullYear();
    }

    const res = await request.get('/api/v1/training/archives', { params });
    archives.value = res.data || [];
    pagination.value.total = res.total || 0;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取培训档案失败');
  } finally {
    loading.value = false;
  }
};

const fetchDepartments = async () => {
  try {
    const res = await request.get('/api/v1/departments');
    departments.value = res.data || [];
  } catch (error) {
    console.error('获取部门列表失败', error);
  }
};

const resetFilters = () => {
  filters.value = {
    departmentId: null,
    year: null,
  };
  pagination.value.page = 1;
  fetchArchives();
};

const handleRowClick = (row: any) => {
  router.push(`/training/archives/${row.id}`);
};

const downloadArchive = async (id: string) => {
  try {
    const res = await request.get(`/api/v1/training/archives/${id}/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([res]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `培训档案_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ElMessage.success('下载成功');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '下载失败');
  }
};

const formatDate = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchDepartments();
  fetchArchives();
});
</script>

<style scoped>
.archive-list {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}
</style>
