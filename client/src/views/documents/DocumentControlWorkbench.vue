<template>
  <div class="document-control-workbench">
    <div class="queue-grid">
      <el-card v-for="card in cards" :key="card.key">
        <template #header>
          <span>{{ card.title }}</span>
        </template>
        <strong class="count">{{ workbench?.counts?.[card.key] ?? 0 }}</strong>
      </el-card>
    </div>

    <el-card class="queue-card">
      <template #header>即将复审</template>
      <el-table :data="workbench?.dueForReview || []" v-loading="loading" stripe>
        <el-table-column prop="number" label="编号" width="160" />
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column prop="review_due_date" label="复审日期" width="160" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentControlApi, type WorkbenchResponse } from '@/api/document-control';

const loading = ref(false);
const workbench = ref<WorkbenchResponse | null>(null);

const cards = computed(() => [
  { key: 'pendingReview', title: '待审核' },
  { key: 'dueForReview', title: '即将复审' },
  { key: 'expiringExternalFiles', title: '外来文件到期' },
  { key: 'obsoleteReferences', title: '作废仍被引用' },
  { key: 'brokenReferences', title: '入口失效' },
  { key: 'missingLandingTargets', title: '表单入口缺失' },
  { key: 'missingMetadata', title: '元数据缺失' },
]);

const fetchWorkbench = async () => {
  loading.value = true;
  try {
    workbench.value = await documentControlApi.getWorkbench(30);
  } catch {
    ElMessage.error('获取文控工作台失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchWorkbench);
</script>

<style scoped>
.queue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.count {
  font-size: 28px;
}
.queue-card {
  margin-top: 12px;
}
</style>
