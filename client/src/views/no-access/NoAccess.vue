<template>
  <div class="no-access">
    <el-result
      icon="warning"
      :title="titleText"
      :sub-title="messageText"
    >
      <template #extra>
        <el-button @click="goBack">返回上一页</el-button>
        <el-button type="primary" data-test="back-home" @click="goHome">返回工作台</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useModuleAccessStore } from '@/stores/moduleAccess';

const MODULE_LABELS: Record<string, string> = {
  work_execution: '工作执行',
  document_approval: '文控与审批',
  production_execution: '生产执行',
  product_rd: '产品研发',
  quality_compliance: '质量与合规',
  equipment_site: '设备与现场',
  traceability_batch: '追溯与批次',
  warehouse: '仓库管理',
  training: '培训',
};

const route = useRoute();
const router = useRouter();
const moduleAccess = useModuleAccessStore();

const moduleKey = computed(() => route.query.module as string | undefined);

const titleText = computed(() =>
  moduleKey.value
    ? `「${MODULE_LABELS[moduleKey.value] ?? moduleKey.value}」模块对当前角色未开启`
    : '当前角色无权访问该页面',
);

const messageText = computed(() => '请联系管理员调整角色或模块开关。');

const goBack = () => router.back();

function goHome() {
  const first = moduleAccess.enabledModules[0];
  const path = !first ? '/dashboard' : moduleHomePath(first);
  router.push({ path });
}

function moduleHomePath(key: string): string {
  switch (key) {
    case 'work_execution': return '/dashboard';
    case 'document_approval': return '/documents';
    case 'production_execution': return '/records';
    case 'product_rd': return '/products';
    case 'quality_compliance': return '/non-conformances';
    case 'equipment_site': return '/equipment';
    case 'traceability_batch': return '/batch-trace';
    case 'warehouse': return '/warehouse/materials';
    case 'training': return '/training/projects';
    default: return '/dashboard';
  }
}
</script>

<style scoped>
.no-access {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
</style>
