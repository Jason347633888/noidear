<template>
  <div class="workflow-statistics">
    <el-row :gutter="16">
      <el-col :span="6">
        <StatCard
          :icon="Folder"
          label="总实例数"
          :value="stats.total"
          icon-bg-color="#409eff"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="Loading"
          label="进行中"
          :value="stats.inProgress"
          icon-bg-color="#e6a23c"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="Select"
          label="已完成"
          :value="stats.completed"
          icon-bg-color="#67c23a"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="Close"
          label="已驳回"
          :value="stats.rejected"
          icon-bg-color="#f56c6c"
        />
      </el-col>
    </el-row>

    <el-card class="chart-card">
      <template #header>
        <span>工作流模板使用统计</span>
      </template>
      <el-table :data="templateStats" v-loading="loading" stripe>
        <el-table-column prop="templateName" label="模板名称" min-width="200" />
        <el-table-column prop="totalInstances" label="总实例" width="100" />
        <el-table-column prop="completedCount" label="已完成" width="100" />
        <el-table-column prop="avgDuration" label="平均耗时" width="120">
          <template #default="{ row }">
            {{ formatDuration(row.avgDuration) }}
          </template>
        </el-table-column>
        <el-table-column prop="completionRate" label="完成率" width="120">
          <template #default="{ row }">
            <el-progress
              :percentage="row.completionRate"
              :color="row.completionRate >= 80 ? '#67c23a' : '#e6a23c'"
              :stroke-width="6"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Folder, Loading, Select, Close } from '@element-plus/icons-vue';
import request from '@/api/request';
import StatCard from '@/components/StatCard.vue';

interface TemplateStats {
  templateName: string;
  totalInstances: number;
  completedCount: number;
  avgDuration: number;
  completionRate: number;
}

const loading = ref(false);
const stats = reactive({ total: 0, inProgress: 0, completed: 0, rejected: 0 });
const templateStats = ref<TemplateStats[]>([]);

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours} 小时 ${mins} 分`;
  const days = Math.floor(hours / 24);
  return `${days} 天 ${hours % 24} 小时`;
};

const fetchStats = async () => {
  loading.value = true;
  try {
    const res = await request.get<{
      total: number;
      inProgress: number;
      completed: number;
      rejected: number;
      templateStats: TemplateStats[];
    }>('/workflow-instances/statistics');
    stats.total = res.total || 0;
    stats.inProgress = res.inProgress || 0;
    stats.completed = res.completed || 0;
    stats.rejected = res.rejected || 0;
    templateStats.value = res.templateStats || [];
  } catch (error) {
    ElMessage.error('获取工作流统计失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => { fetchStats(); });
</script>

<style scoped>
.workflow-statistics {
  padding: 20px;
}

.workflow-statistics .el-row {
  margin-bottom: 16px;
}

.chart-card {
  margin-bottom: 16px;
}
</style>
