<template>
  <div class="document-control-workbench">
    <PageHeaderBlock title="文控工作台" eyebrow="文控与审批" />
    <div class="queue-grid">
      <el-card
        v-for="card in cards"
        :key="card.key"
        :data-test="`workbench-card-${card.key}`"
        class="action-card"
        role="button"
        tabindex="0"
        @click="openCard(card)"
        @keydown.enter.prevent="openCard(card)"
        @keydown.space.prevent="openCard(card)"
      >
        <template #header>
          <span>{{ card.title }}</span>
        </template>
        <strong class="count">{{ workbench?.counts?.[card.key] ?? 0 }}</strong>
        <span class="severity" :class="`severity-${card.severity}`">
          {{ card.severity === 'high' ? '需优先处理' : '待处理' }}
        </span>
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
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { documentControlApi, type WorkbenchResponse } from '@/api/document-control';

const router = useRouter();
const loading = ref(false);
const workbench = ref<WorkbenchResponse | null>(null);

const cards = computed(() => [
  { key: 'pendingReview', title: '待审核', severity: 'medium' },
  { key: 'dueForReview', title: '即将复审', severity: 'medium' },
  { key: 'expiringExternalFiles', title: '外来文件到期', severity: 'high' },
  { key: 'obsoleteReferences', title: '作废仍被引用', severity: 'high' },
  { key: 'brokenReferences', title: '入口失效', severity: 'medium' },
  { key: 'missingLandingTargets', title: '表单入口缺失', severity: 'high' },
  { key: 'unconfirmedLandingTargets', title: '落地未确认', severity: 'medium' },
  { key: 'partialFieldCoverage', title: '字段覆盖异常', severity: 'medium' },
  { key: 'unimplementedRecordReferences', title: '引用表单未落地', severity: 'medium' },
  { key: 'missingMetadata', title: '元数据缺失', severity: 'medium' },
  { key: 'trainingNeeds', title: '培训需求未处理', severity: 'medium' },
  { key: 'openImpactItems', title: '影响项未关闭', severity: 'medium' },
]);

const openCard = (card: { key: string }) => router.push({
  path: '/documents/control/workbench/issues',
  query: { type: card.key },
});

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
.document-control-workbench {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.queue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.count {
  font-size: 28px;
}
.action-card {
  cursor: pointer;
}
.queue-card {
  margin-top: 12px;
}
.severity {
  display: block;
  margin-top: 6px;
  font-size: 12px;
}
.severity-high {
  color: #c45656;
}
.severity-medium {
  color: #e6a23c;
}
</style>
