<template>
  <div class="traceability-shell">
    <PageHeaderBlock
      eyebrow="追溯与批次"
      title="追溯查询"
      description="按关系链查询影响范围与证据"
    />

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

    <div class="evidence-export-bar">
      <span class="toolbar-label">一键证据导出</span>
      <el-input
        v-model="evidenceBatchId"
        size="small"
        placeholder="生产批次ID"
        style="width: 220px"
      />
      <el-button
        size="small"
        type="primary"
        :loading="evidenceLoading"
        @click="runEvidenceExport"
      >生成证据快照</el-button>
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
const evidenceBatchId = ref('');
const evidenceLoading = ref(false);

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
    if (payload.scenario === 'materialBalance') {
      const balance = await traceabilityApi.materialBalance({
        productionBatchId: payload.filters?.objectType === 'productionBatch' ? payload.filters.objectId : undefined,
        materialLotId: payload.filters?.objectType === 'materialLot' ? payload.filters.objectId : undefined,
        timeMode: payload.timeMode,
        asOfAt: payload.asOfAt,
        includeEvidence: true,
        includeRecommendations: true,
      });
      result.value = null;
      ElMessage.success(`物料平衡分析完成：${balance.summary.status}`);
      return;
    }

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

const runEvidenceExport = async () => {
  if (!evidenceBatchId.value) {
    ElMessage.warning('请输入生产批次ID');
    return;
  }
  evidenceLoading.value = true;
  try {
    const snapshot = await traceabilityApi.exportProductionBatchEvidence(evidenceBatchId.value);
    if (snapshot.readinessStatus === 'complete') {
      ElMessage.success('证据快照与导出已生成');
    } else {
      ElMessage.warning(`生成的是预览快照（未就绪）：${(snapshot.readinessReasons ?? []).join('；')}`);
    }
  } catch {
    ElMessage.error('证据快照生成失败');
  } finally {
    evidenceLoading.value = false;
  }
};
</script>

<style scoped>
.traceability-shell {
  font-family: 'Inter', sans-serif;
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
  color: #7f8c8d;
}

.evidence-export-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
</style>
