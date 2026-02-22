<template>
  <div class="instance-detail" v-loading="loading">
    <el-page-header @back="router.back()" content="工作流实例详情" />

    <el-card class="info-card" v-if="instance">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <el-tag :type="statusTypeMap[instance.status]">
            {{ statusTextMap[instance.status] }}
          </el-tag>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="实例ID">{{ instance.id }}</el-descriptions-item>
        <el-descriptions-item label="工作流模板">{{ instance.template?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">{{ instance.businessType }}</el-descriptions-item>
        <el-descriptions-item label="发起人">{{ instance.initiator?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前步骤">第 {{ instance.currentStep + 1 }} 步</el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ new Date(instance.createdAt).toLocaleString('zh-CN') }}
        </el-descriptions-item>
        <el-descriptions-item label="完成时间" v-if="instance.completedAt">
          {{ new Date(instance.completedAt).toLocaleString('zh-CN') }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="timeline-card" v-if="instance?.tasks?.length">
      <template #header>
        <span>审批进度</span>
      </template>
      <el-timeline>
        <el-timeline-item
          v-for="task in instance.tasks"
          :key="task.id"
          :type="timelineType(task.status)"
          :timestamp="new Date(task.createdAt).toLocaleString('zh-CN')"
          placement="top"
        >
          <el-card shadow="never" class="timeline-content">
            <div class="timeline-row">
              <span class="timeline-label">步骤 {{ task.stepIndex + 1 }}</span>
              <el-tag :type="taskStatusType(task.status)" size="small">
                {{ taskStatusText(task.status) }}
              </el-tag>
            </div>
            <div class="timeline-row">
              <span>处理人：{{ task.assignee?.name || '-' }}</span>
              <span v-if="task.completedAt">
                完成时间：{{ new Date(task.completedAt).toLocaleString('zh-CN') }}
              </span>
            </div>
            <div v-if="task.comment" class="timeline-comment">
              意见：{{ task.comment }}
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import workflowApi, { type WorkflowInstance } from '@/api/workflow';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const instance = ref<WorkflowInstance | null>(null);

const statusTextMap: Record<string, string> = {
  pending: '待处理', in_progress: '进行中', completed: '已完成', rejected: '已驳回', cancelled: '已取消',
};
const statusTypeMap: Record<string, string> = {
  pending: 'warning', in_progress: 'primary', completed: 'success', rejected: 'danger', cancelled: 'info',
};
const taskStatusText = (s: string) => ({ pending: '待处理', approved: '已通过', rejected: '已驳回', cancelled: '已取消' }[s] || s);
const taskStatusType = (s: string) => ({ pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'info' }[s] || 'info');
const timelineType = (s: string) => ({ pending: 'primary', approved: 'success', rejected: 'danger', cancelled: 'info' }[s] || 'primary');

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await workflowApi.getInstanceById(route.params.id as string);
    instance.value = res;
  } catch (error) {
    ElMessage.error('获取实例详情失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.instance-detail { padding: 0; }
.info-card { margin-top: 16px; margin-bottom: 16px; }
.timeline-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.timeline-content { background: #fafafa; }
.timeline-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.timeline-label { font-weight: 600; }
.timeline-comment { color: #606266; font-size: 13px; margin-top: 4px; padding: 8px; background: #f0f2f5; border-radius: 4px; }
</style>
