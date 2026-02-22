<template>
  <div class="project-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>培训项目详情</span>
          <div>
            <el-button @click="handleBack">返回</el-button>
          </div>
        </div>
      </template>

      <div v-if="project">
        <!-- 基本信息 -->
        <el-descriptions title="基本信息" :column="2" border>
          <el-descriptions-item label="培训标题">{{ project.title }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(project.status)">
              {{ getStatusText(project.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="部门">{{ project.department }}</el-descriptions-item>
          <el-descriptions-item label="季度">第{{ project.quarter }}季度</el-descriptions-item>
          <el-descriptions-item label="培训讲师">
            {{ project.trainer?.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="计划日期">
            {{ project.scheduledDate ? formatDate(project.scheduledDate) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="及格分数">
            {{ project.passingScore }} 分
          </el-descriptions-item>
          <el-descriptions-item label="最大考试次数">
            {{ project.maxAttempts }} 次
          </el-descriptions-item>
          <el-descriptions-item label="学员数量" :span="2">
            {{ project.traineeCount || project.trainees.length }} 人
          </el-descriptions-item>
          <el-descriptions-item label="培训描述" :span="2">
            {{ project.description || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 培训资料 -->
        <div class="section">
          <h3>培训资料</h3>
          <el-table :data="project.documents" stripe v-if="project.documents && project.documents.length > 0">
            <el-table-column prop="code" label="文档编号" width="180" />
            <el-table-column prop="title" label="文档标题" min-width="200" />
            <el-table-column prop="level" label="文档等级" width="100">
              <template #default="{ row }">第{{ row.level }}级</template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleViewDocument(row.id)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无培训资料" />
        </div>

        <!-- 学员管理 -->
        <div class="section">
          <div class="section-header">
            <h3>学员管理</h3>
            <div v-if="project.status === 'planned' || project.status === 'ongoing'">
              <el-button type="primary" size="small" @click="handleAddTrainee">添加学员</el-button>
            </div>
          </div>
          <el-table :data="project.traineeList" stripe>
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="username" label="用户名" width="150" />
            <el-table-column prop="department" label="部门" width="120" />
            <el-table-column label="操作" width="120" v-if="project.status === 'planned' || project.status === 'ongoing'">
              <template #default="{ row }">
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="handleRemoveTrainee(row.id)"
                >
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 学习记录 -->
        <div class="section">
          <div class="section-header">
            <h3>学习记录</h3>
            <div>
              <el-button
                type="primary"
                size="small"
                @click="router.push(`/training/projects/${project.id}/questions`)"
              >
                管理考试题目
              </el-button>
            </div>
          </div>
          <LearningRecordTable :records="learningRecords" :loading="recordsLoading" />
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <el-button
            type="success"
            @click="handleStart"
            v-if="project.status === 'planned'"
          >
            开始培训
          </el-button>
          <el-button
            type="primary"
            @click="handleComplete"
            v-if="project.status === 'ongoing'"
          >
            完成培训
          </el-button>
          <el-button
            type="danger"
            @click="handleCancel"
            v-if="project.status === 'planned' || project.status === 'ongoing'"
          >
            取消培训
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 添加学员对话框 -->
    <el-dialog v-model="traineeDialogVisible" title="添加学员" width="600px">
      <el-select
        v-model="selectedTrainees"
        multiple
        filterable
        placeholder="请选择学员"
        style="width: 100%"
      >
        <el-option
          v-for="user in availableUsers"
          :key="user.id"
          :label="`${user.name} (${user.department?.name || '未分配'})`"
          :value="user.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="traineeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAddTrainee">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getTrainingProjectById,
  startTrainingProject,
  completeTrainingProject,
  cancelTrainingProject,
  addTrainee,
  removeTrainee,
  getLearningRecords,
} from '@/api/training';
import request from '@/api/request';
import LearningRecordTable from '@/components/training/LearningRecordTable.vue';
import type { TrainingProject, LearningRecord } from '@/types/training';
import dayjs from 'dayjs';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const recordsLoading = ref(false);
const project = ref<TrainingProject | null>(null);
const learningRecords = ref<LearningRecord[]>([]);
const traineeDialogVisible = ref(false);
const selectedTrainees = ref<string[]>([]);
const availableUsers = ref<any[]>([]);

const fetchProject = async () => {
  loading.value = true;
  try {
    project.value = await getTrainingProjectById(route.params.id as string);
    await fetchLearningRecords();
  } catch (error: any) {
    ElMessage.error(error.message || '获取培训项目失败');
    router.back();
  } finally {
    loading.value = false;
  }
};

const fetchLearningRecords = async () => {
  if (!project.value) return;

  recordsLoading.value = true;
  try {
    learningRecords.value = await getLearningRecords({ projectId: project.value.id });
  } catch (error: any) {
    ElMessage.error(error.message || '获取学习记录失败');
  } finally {
    recordsLoading.value = false;
  }
};

const fetchUsers = async () => {
  try {
    const res = await request.get<{ list: any[]; total: number }>('/users', {
      params: { limit: 1000 },
    });
    availableUsers.value = res.list || [];
  } catch (error: any) {
    ElMessage.error(error.message || '获取用户列表失败');
  }
};

const handleAddTrainee = async () => {
  await fetchUsers();
  traineeDialogVisible.value = true;
  selectedTrainees.value = [];
};

const handleConfirmAddTrainee = async () => {
  if (selectedTrainees.value.length === 0) {
    ElMessage.warning('请至少选择一名学员');
    return;
  }

  if (!project.value) {
    ElMessage.error('培训项目不存在');
    return;
  }

  try {
    for (const userId of selectedTrainees.value) {
      await addTrainee(project.value.id, userId);
    }
    ElMessage.success('添加学员成功');
    traineeDialogVisible.value = false;
    await fetchProject();
  } catch (error: any) {
    ElMessage.error(error.message || '添加学员失败');
  }
};

const handleRemoveTrainee = async (userId: string) => {
  if (!project.value) {
    ElMessage.error('培训项目不存在');
    return;
  }

  try {
    await ElMessageBox.confirm('确定要移除该学员吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await removeTrainee(project.value.id, userId);
    ElMessage.success('移除学员成功');
    await fetchProject();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '移除学员失败');
    }
  }
};

const handleStart = async () => {
  if (!project.value) return;

  try {
    await ElMessageBox.confirm('确定要开始该培训项目吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    });

    await startTrainingProject(project.value.id);
    ElMessage.success('培训项目已开始');
    await fetchProject();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
};

const handleComplete = async () => {
  if (!project.value) return;

  try {
    await ElMessageBox.confirm('确定要完成该培训项目吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    });

    await completeTrainingProject(project.value.id);
    ElMessage.success('培训项目已完成');
    await fetchProject();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
};

const handleCancel = async () => {
  if (!project.value) return;

  try {
    const { value: reason } = await ElMessageBox.prompt('请输入取消原因', '取消培训', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '请输入取消原因',
    });

    await cancelTrainingProject(project.value.id, reason);
    ElMessage.success('培训项目已取消');
    await fetchProject();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
};

const handleViewDocument = (id: string) => {
  router.push(`/documents/${id}`);
};

const handleBack = () => {
  router.back();
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
  fetchProject();
});
</script>

<style scoped>
.project-detail {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section {
  margin-top: 30px;
}

.section h3 {
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: bold;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  margin: 0;
}

.action-buttons {
  margin-top: 30px;
  display: flex;
  gap: 10px;
}
</style>
