<template>
  <div class="document-health-dashboard">
    <PageHeaderBlock title="文控健康仪表盘" eyebrow="文控与审批" />
    <div class="health-grid">
      <div class="app-panel" v-for="item in items" :key="item.key">
        <div class="app-panel-header"><h3 class="app-panel-header__title">{{ item.label }}</h3></div>
        <div class="app-panel--padded"><strong>{{ health?.[item.key] ?? 0 }}</strong></div>
      </div>
    </div>
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
.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
strong {
  font-size: 28px;
}
</style>
