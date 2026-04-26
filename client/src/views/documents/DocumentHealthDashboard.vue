<template>
  <div class="document-health-dashboard">
    <el-card v-for="item in items" :key="item.key">
      <template #header>{{ item.label }}</template>
      <strong>{{ health?.[item.key] ?? 0 }}</strong>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const health = ref<Record<string, number> | null>(null);
const items = [
  { key: 'missingOwnerOrReview', label: '缺少负责人或复审日期' },
  { key: 'overdueReview', label: '复审逾期' },
  { key: 'expiredExternal', label: '外来文件即将/已经到期' },
  { key: 'overdueReadRequirements', label: '阅读确认逾期' },
  { key: 'openTrainingNeeds', label: '培训需求待处理' },
  { key: 'openImpactItems', label: '影响项待处理' },
];

const load = async () => {
  try {
    health.value = await documentOperationsApi.getHealth(30) as Record<string, number>;
  } catch {
    ElMessage.error('获取文控健康度失败');
  }
};

onMounted(load);
</script>

<style scoped>
.document-health-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
strong {
  font-size: 28px;
}
</style>
