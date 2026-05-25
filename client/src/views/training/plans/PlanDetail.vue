<template>
  <div class="plan-detail-container">
    <PageHeaderBlock eyebrow="培训与内审" title="培训计划详情" />

    <div class="app-panel detail-card">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">基本信息</h3>
        <div class="app-panel-header__actions">
          <el-button type="primary" @click="handleAddProject">添加培训项目</el-button>
          <el-button type="success" @click="handleSubmit" v-if="canSubmit">提交审批</el-button>
          <el-button type="warning" @click="handleEdit" v-if="canEdit">编辑</el-button>
        </div>
      </div>
      <div class="app-panel--padded" v-loading="loading">
      <el-descriptions :column="2" border v-if="plan">
        <el-descriptions-item label="年度">{{ plan.year }}年</el-descriptions-item>
        <el-descriptions-item label="计划标题">{{ plan.title }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(plan.status)">{{ getStatusLabel(plan.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建人">{{ plan.creator?.name }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(plan.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDate(plan.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
      </div>
    </div>

    <div class="app-panel projects-card" v-loading="loading">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">培训项目列表 ({{ projects.length }}个)</h3>
      </div>
      <div class="app-panel--padded">
      <el-table :data="projects" stripe>
        <el-table-column prop="title" label="项目标题" min-width="200" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="quarter" label="季度" width="100">
          <template #default="{ row }">
            Q{{ row.quarter }}
          </template>
        </el-table-column>
        <el-table-column prop="trainer.name" label="讲师" width="120" />
        <el-table-column prop="traineeCount" label="学员数" width="100">
          <template #default="{ row }">
            {{ row.traineeCount || 0 }}人
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getProjectStatusType(row.status)">
              {{ getProjectStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scheduledDate" label="计划日期" width="120">
          <template #default="{ row }">
            {{ row.scheduledDate ? formatDate(row.scheduledDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewProject(row.id)">查看</el-button>
            <el-button link type="primary" @click="handleEditProject(row.id)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="projects.length === 0" description="暂无培训项目" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import {
  getTrainingPlanById,
  submitTrainingPlanForApproval,
} from '@/api/training';
import type { TrainingPlan } from '@/types/training';

const router = useRouter();
const route = useRoute();

// State
const loading = ref(false);
const plan = ref<TrainingPlan | null>(null);
const projects = computed(() => plan.value?.projects || []);

// Permission checks
const canEdit = computed(() => {
  return plan.value?.status === 'draft' || plan.value?.status === 'rejected';
});

const canSubmit = computed(() => {
  return plan.value?.status === 'draft' || plan.value?.status === 'rejected';
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

// Project status type mapping
const getProjectStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    planned: '',
    ongoing: 'warning',
    completed: 'success',
    cancelled: 'info',
  };
  return typeMap[status] || '';
};

// Project status label mapping
const getProjectStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    planned: '计划中',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return labelMap[status] || status;
};

// Format date
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD');
};

// Fetch plan detail
const fetchPlanDetail = async () => {
  loading.value = true;
  try {
    const id = route.params.id as string;
    plan.value = await getTrainingPlanById(id);
  } catch (error) {
    ElMessage.error('获取培训计划详情失败');
  } finally {
    loading.value = false;
  }
};

// Handle edit
const handleEdit = () => {
  if (!plan.value) return;
  router.push(`/training/plans/${plan.value.id}/edit`);
};

// Handle submit for approval
const handleSubmit = async () => {
  if (!plan.value) return;

  try {
    await ElMessageBox.confirm('确定要提交审批吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await submitTrainingPlanForApproval(plan.value.id);
    ElMessage.success('提交成功');
    fetchPlanDetail();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交失败');
    }
  }
};

// Handle add project
const handleAddProject = () => {
  if (!plan.value) return;
  router.push(`/training/projects/create?planId=${plan.value.id}`);
};

// Handle view project
const handleViewProject = (projectId: string) => {
  router.push(`/training/projects/${projectId}`);
};

// Handle edit project
const handleEditProject = (projectId: string) => {
  router.push(`/training/projects/${projectId}/edit`);
};

// Lifecycle
onMounted(() => {
  fetchPlanDetail();
});
</script>

<style scoped lang="scss">
.plan-detail-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.el-page-header {
  margin-bottom: 20px;
}

.detail-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: 18px;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 10px;
  }
}

.projects-card {
  .title {
    font-size: 16px;
    font-weight: 500;
  }
}
</style>
