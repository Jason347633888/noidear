<template>
  <div class="project-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>培训项目列表</span>
          <el-button type="primary" @click="handleCreate">创建培训项目</el-button>
        </div>
      </template>

      <!-- 筛选区域 -->
      <AdvancedFilter
        v-model="filterForm"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      />

      <!-- 表格 -->
      <el-table :data="projects" v-loading="loading" stripe>
        <el-table-column prop="title" label="培训标题" min-width="150" />
        <el-table-column prop="department" label="部门" width="100" />
        <el-table-column prop="quarter" label="季度" width="80">
          <template #default="{ row }">第{{ row.quarter }}季度</template>
        </el-table-column>
        <el-table-column prop="trainer.name" label="培训讲师" width="100" />
        <el-table-column label="学员数量" width="90" align="center">
          <template #default="{ row }">{{ row.traineeCount || row.trainees.length }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scheduledDate" label="计划日期" width="120">
          <template #default="{ row }">
            {{ row.scheduledDate ? formatDate(row.scheduledDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="120">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row.id)">
              查看
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              @click="handleEdit(row.id)"
              v-if="row.status === 'planned'"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="handleDelete(row.id)"
              v-if="row.status === 'planned'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无培训项目数据" />
        </template>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getTrainingProjects, deleteTrainingProject } from '@/api/training';
import { getDepartments, type Department } from '@/api/department';
import type { TrainingProject, TrainingProjectQueryDto } from '@/types/training';
import dayjs from 'dayjs';
import AdvancedFilter, { type FilterField } from '@/components/AdvancedFilter.vue';

const router = useRouter();
const loading = ref(false);
const projects = ref<TrainingProject[]>([]);
const departments = ref<Department[]>([]);

const filterForm = reactive({
  department: '',
  quarter: undefined as number | undefined,
  status: '',
  keyword: '',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const filterFields = computed<FilterField[]>(() => [
  {
    prop: 'department',
    label: '部门',
    type: 'select',
    placeholder: '请选择部门',
    options: departments.value.map(dept => ({
      label: dept.name,
      value: dept.name
    })),
    colMd: 6
  },
  {
    prop: 'quarter',
    label: '季度',
    type: 'select',
    placeholder: '请选择季度',
    options: [
      { label: '第一季度', value: 1 },
      { label: '第二季度', value: 2 },
      { label: '第三季度', value: 3 },
      { label: '第四季度', value: 4 }
    ],
    colMd: 6
  },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '计划中', value: 'planned' },
      { label: '进行中', value: 'ongoing' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ],
    colMd: 6
  },
  {
    prop: 'keyword',
    label: '关键词',
    type: 'input',
    placeholder: '搜索培训标题',
    showSearchIcon: true,
    colMd: 6
  }
]);

const fetchDepartments = async () => {
  try {
    const res = await getDepartments({ limit: 100 });
    departments.value = res.list;
  } catch (error) {
    ElMessage.error('获取部门列表失败');
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params: TrainingProjectQueryDto = {
      page: pagination.page,
      limit: pagination.limit,
      department: filterForm.department || undefined,
      quarter: filterForm.quarter,
      status: filterForm.status as any,
      keyword: filterForm.keyword || undefined,
    };

    const res = await getTrainingProjects(params);
    projects.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    ElMessage.error(error.message || '获取培训项目列表失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  router.push('/training/projects/create');
};

const handleView = (id: string) => {
  router.push(`/training/projects/${id}`);
};

const handleEdit = (id: string) => {
  router.push(`/training/projects/${id}/edit`);
};

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除该培训项目吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await deleteTrainingProject(id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.department = '';
  filterForm.quarter = undefined;
  filterForm.status = '';
  filterForm.keyword = '';
  handleSearch();
};

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD');
};

const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    planned: 'info',
    ongoing: 'warning',
    completed: 'success',
    cancelled: 'danger',
  };
  return typeMap[status] || 'info';
};

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    planned: '计划中',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return textMap[status] || status;
};

onMounted(() => {
  fetchDepartments();
  fetchData();
});
</script>

<style scoped>
.project-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-form {
  margin-bottom: 20px;
}
</style>
