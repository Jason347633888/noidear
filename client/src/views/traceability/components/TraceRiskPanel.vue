<template>
  <el-card v-if="result?.risks?.length || result" shadow="never" style="margin-top: 16px">
    <div class="panel-header">风险汇总与操作</div>

    <template v-if="result?.risks?.length">
      <el-alert
        v-for="risk in result.risks"
        :key="risk.code"
        :title="risk.message"
        :type="alertType(risk.level)"
        show-icon
        style="margin-bottom: 8px"
        :closable="false"
      />
    </template>
    <el-empty v-else-if="result" description="无风险标记" :image-size="48" />

    <div v-if="result?.permission?.canInitiateAction" class="action-row">
      <span class="action-label">发起联动</span>
      <el-button size="small" @click="$emit('linkage', 'deviation')">偏差</el-button>
      <el-button size="small" @click="$emit('linkage', 'complaint')">投诉</el-button>
      <el-button
        v-if="result?.permission?.canExecuteHighRiskAction"
        size="small"
        type="danger"
        @click="$emit('linkage', 'recallAssessment')"
      >
        召回评估
      </el-button>
    </div>

    <div v-if="result" class="action-row">
      <span class="action-label">导出</span>
      <el-button size="small" @click="$emit('export', 'simple')">简报导出</el-button>
      <el-button size="small" type="primary" @click="$emit('export', 'fullPackage')">完整包导出</el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { TraceQueryResult, TraceRiskLevel } from '@/types/traceability';

defineProps<{ result: TraceQueryResult | null }>();
defineEmits<{
  linkage: [actionType: string];
  export: [exportMode: 'simple' | 'fullPackage'];
}>();

const alertType = (level: TraceRiskLevel) => {
  const map: Record<TraceRiskLevel, 'success' | 'info' | 'warning' | 'error'> = {
    normal: 'success',
    minor: 'info',
    important: 'warning',
    high: 'error',
  };
  return map[level];
};
</script>

<style scoped>
.panel-header {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #c9a227;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.action-label {
  font-size: 12px;
  color: #909399;
  min-width: 60px;
}
</style>
