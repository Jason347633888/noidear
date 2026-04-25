<template>
  <div class="traceability-shell">
    <div class="page-header">
      <h1 class="page-title">追溯查询</h1>
      <p class="page-subtitle">对象查询 · 场景工作台 · 台账视图 · 链路图视图</p>
    </div>

    <div class="toolbar-row">
      <div class="toolbar-group">
        <span class="toolbar-label">入口</span>
        <el-radio-group v-model="activeEntry" size="small">
          <el-radio-button value="object">对象查询</el-radio-button>
          <el-radio-button value="scenario">场景工作台</el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-group">
        <span class="toolbar-label">视图</span>
        <el-radio-group v-model="activeView" size="small">
          <el-radio-button value="ledger">台账视图</el-radio-button>
          <el-radio-button value="graph">链路图视图</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <ObjectTraceQueryPanel v-if="activeEntry === 'object'" @submit="runObjectQuery" />
    <ScenarioWorkbenchPanel v-else @submit="runScenarioQuery" />

    <el-alert v-if="error" :title="error" type="error" show-icon closable style="margin-top: 16px" @close="error = ''" />

    <TraceRiskPanel :result="result" @linkage="createLinkage" @export="createExport" />
    <TraceLedgerView v-if="activeView === 'ledger'" :result="result" />
    <TraceGraphView v-else :result="result" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { traceabilityApi } from '@/api/traceability';
import type { TraceQueryResult } from '@/types/traceability';
import ObjectTraceQueryPanel from './components/ObjectTraceQueryPanel.vue';
import ScenarioWorkbenchPanel from './components/ScenarioWorkbenchPanel.vue';
import TraceLedgerView from './components/TraceLedgerView.vue';
import TraceGraphView from './components/TraceGraphView.vue';
import TraceRiskPanel from './components/TraceRiskPanel.vue';

const activeEntry = ref<'object' | 'scenario'>('object');
const activeView = ref<'ledger' | 'graph'>('ledger');
const result = ref<TraceQueryResult | null>(null);
const error = ref('');

const runObjectQuery = async (payload: any) => {
  error.value = '';
  try {
    result.value = await traceabilityApi.query({ ...payload, viewMode: activeView.value }) as TraceQueryResult;
  } catch {
    error.value = '查询失败，请检查对象编号是否正确';
  }
};

const runScenarioQuery = async (payload: any) => {
  error.value = '';
  try {
    result.value = await traceabilityApi.query({ ...payload, viewMode: activeView.value }) as TraceQueryResult;
  } catch {
    error.value = '场景分析失败，请稍后重试';
  }
};

const createLinkage = async (actionType: string) => {
  if (!result.value) return;
  try {
    await traceabilityApi.createLinkage({
      actionType: actionType as 'deviation' | 'complaint' | 'recallAssessment' | 'traceabilityDrill' | 'capa',
      sourceQueryRef: result.value.summary.queryId ?? '',
    });
    ElMessage.success('联动已发起');
  } catch {
    ElMessage.error('联动发起失败');
  }
};

const createExport = async (exportMode: 'simple' | 'fullPackage') => {
  if (!result.value) return;
  try {
    await traceabilityApi.export({
      exportMode,
      sourceQueryRef: result.value.summary.queryId ?? '',
    });
    ElMessage.success(exportMode === 'simple' ? '导出已就绪' : '完整包已排队，稍后可下载');
  } catch {
    ElMessage.error('导出失败');
  }
};
</script>

<style scoped>
.traceability-shell {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text-light: #7f8c8d;
  font-family: 'Inter', sans-serif;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-light);
  margin: 0;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 12px;
  color: var(--text-light);
}
</style>
