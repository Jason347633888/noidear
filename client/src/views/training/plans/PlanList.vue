<template>
  <div class="plan-list-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">年度培训计划</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新建计划
          </el-button>
        </div>
      </template>

      <!-- Filters -->
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="年度">
          <el-select v-model="filters.year" placeholder="请选择年度" clearable style="width: 120px">
            <el-option
              v-for="year in yearOptions"
              :key="year"
              :label="`${year}年`"
              :value="year"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="请选择状态" clearable style="width: 150px">
            <el-option label="草稿" value="draft" />
            <el-option label="待审批" value="pending_approval" />
            <el-option label="已批准" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="请输入关键词"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- Table -->
      <el-table :data="planList" v-loading="loading" stripe>
        <el-table-column prop="year" label="年度" width="100">
          <template #default="{ row }">
            {{ row.year }}年
          </template>
        </el-table-column>
        <el-table-column prop="title" label="计划标题" min-width="200" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="projectCount" label="培训项目" width="100">
          <template #default="{ row }">
            {{ row.projectCount || 0 }}个
          </template>
        </el-table-column>
        <el-table-column prop="creator.name" label="创建人" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row.id)">查看</el-button>
            <el-button link type="primary" @click="handleEdit(row)" v-if="canEdit(row)">
              编辑
            </el-button>
            <el-button link type="success" @click="handleSubmit(row)" v-if="canSubmit(row)">
              提交审批
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-if="canDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无培训计划数据" />
        </template>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchPlans"
          @size-change="fetchPlans"
        />
      </div>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="年度" prop="year">
          <el-select v-model="form.year" placeholder="请选择年度" style="width: 100%">
            <el-option
              v-for="year in yearOptions"
              :key="year"
              :label="`${year}年`"
              :value="year"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="计划标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入计划标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import {
  getTrainingPlans,
  createTrainingPlan,
  updateTrainingPlan,
  deleteTrainingPlan,
  submitTrainingPlanForApproval,
} from '@/api/training';
import type { TrainingPlan } from '@/types/training';

const router = useRouter();

// State
const loading = ref(false);
const submitting = ref(false);
const planList = ref<TrainingPlan[]>([]);
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingId = ref<string>('');
const formRef = ref<FormInstance>();

// Filters
const filters = reactive({
  year: undefined as number | undefined,
  status: '',
  keyword: '',
});

// Pagination
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// Form
const form = reactive({
  year: new Date().getFullYear(),
  title: '',
});

// Year options (last 5 years + next 2 years)
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = -5; i <= 2; i++) {
    years.push(currentYear + i);
  }
  return years;
});

// Form rules
const rules: FormRules = {
  year: [{ required: true, message: '请选择年度', trigger: 'change' }],
  title: [{ required: true, message: '请输入计划标题', trigger: 'blur' }],
};

// Dialog title
const dialogTitle = computed(() => {
  return dialogMode.value === 'create' ? '新建培训计划' : '编辑培训计划';
});

// Status type mapping
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    draft: '',
    pending_approval: 'warning',
    approved: 'success',
    rejected: 'danger',
  };
  return typeMap[status] || '';
};

// Status label mapping
const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    draft: '草稿',
    pending_approval: '待审批',
    approved: '已批准',
    rejected: '已驳回',
  };
  return labelMap[status] || status;
};

// Format date
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

// Permission checks
const canEdit = (plan: TrainingPlan) => {
  return plan.status === 'draft' || plan.status === 'rejected';
};

const canSubmit = (plan: TrainingPlan) => {
  return plan.status === 'draft' || plan.status === 'rejected';
};

const canDelete = (plan: TrainingPlan) => {
  return plan.status === 'draft';
};

// Fetch plans
const fetchPlans = async () => {
  loading.value = true;
  try {
    const { items, total } = await getTrainingPlans({
      page: pagination.page,
      limit: pagination.limit,
      year: filters.year,
      status: filters.status as any,
      keyword: filters.keyword,
    });
    planList.value = items;
    pagination.total = total;
  } catch (error) {
    ElMessage.error('获取培训计划列表失败');
  } finally {
    loading.value = false;
  }
};

// Handle search
const handleSearch = () => {
  pagination.page = 1;
  fetchPlans();
};

// Handle reset
const handleReset = () => {
  filters.year = undefined;
  filters.status = '';
  filters.keyword = '';
  pagination.page = 1;
  fetchPlans();
};

// Handle create
const handleCreate = () => {
  dialogMode.value = 'create';
  form.year = new Date().getFullYear();
  form.title = '';
  dialogVisible.value = true;
  formRef.value?.clearValidate();
};

// Handle edit
const handleEdit = (plan: TrainingPlan) => {
  dialogMode.value = 'edit';
  editingId.value = plan.id;
  form.year = plan.year;
  form.title = plan.title;
  dialogVisible.value = true;
  formRef.value?.clearValidate();
};

// Handle view
const handleView = (id: string) => {
  router.push(`/training/plans/${id}`);
};

// Handle submit form
const handleSubmitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (dialogMode.value === 'create') {
        await createTrainingPlan(form);
        ElMessage.success('创建成功');
      } else {
        await updateTrainingPlan(editingId.value, form);
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      fetchPlans();
    } catch (error: any) {
      ElMessage.error(error.message || '操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

// Handle submit for approval
const handleSubmit = async (plan: TrainingPlan) => {
  try {
    await ElMessageBox.confirm('确定要提交审批吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await submitTrainingPlanForApproval(plan.id);
    ElMessage.success('提交成功');
    fetchPlans();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交失败');
    }
  }
};

// Handle delete
const handleDelete = async (plan: TrainingPlan) => {
  try {
    await ElMessageBox.confirm('确定要删除该培训计划吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await deleteTrainingPlan(plan.id);
    ElMessage.success('删除成功');
    fetchPlans();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

// Lifecycle
onMounted(() => {
  fetchPlans();
});
</script>

<style scoped lang="scss">
.plan-list-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: 18px;
    font-weight: 500;
  }
}

.filter-form {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
