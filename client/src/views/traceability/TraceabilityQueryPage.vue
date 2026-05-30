<template>
  <div class="traceability-query-page">
    <PageHeaderBlock
      eyebrow="追溯与批次"
      title="追溯查询"
      description="按关系链查询影响范围，并可创建快照用于演练与证据导出"
    />

    <div class="toolbar-row">
      <div class="toolbar-group">
        <span class="toolbar-label">查询入口</span>
        <el-radio-group v-model="activeEntry" size="small">
          <el-radio-button value="object">对象查询</el-radio-button>
          <el-radio-button value="scenario">场景工作台</el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-group">
        <span class="toolbar-label">视图</span>
        <el-radio-group v-model="activeView" size="small">
          <el-radio-button value="ledger">台账</el-radio-button>
          <el-radio-button value="graph">链路图</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <ObjectTraceQueryPanel v-if="activeEntry === 'object'" @submit="runObjectQuery" />
    <ScenarioWorkbenchPanel v-else @submit="runScenarioQuery" />

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      closable
      style="margin-top: 16px"
      @close="error = ''"
    />

    <TraceRiskPanel :result="result" @linkage="createLinkage" @export="createExport" />
    <TraceLedgerView v-if="activeView === 'ledger'" :result="result" />
    <TraceGraphView v-else :result="result" />

    <el-card v-if="result" class="snapshot-preview-card">
      <template #header>
        <div class="snapshot-header">
          <span class="snapshot-title">快照预览</span>
          <div class="snapshot-actions">
            <el-input
              v-model="snapshotBatchId"
              size="small"
              placeholder="生产批次ID（可选）"
              style="width: 200px; margin-right: 8px"
            />
            <el-button
              size="small"
              :loading="snapshotLoading"
              @click="createSnapshot('preview')"
            >预览快照</el-button>
            <el-button
              size="small"
              type="primary"
              :loading="snapshotLoading"
              @click="createSnapshot('export')"
            >生成证据快照</el-button>
          </div>
        </div>
      </template>
      <div v-if="latestSnapshot" class="snapshot-result">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="快照ID">{{ latestSnapshot.id }}</el-descriptions-item>
          <el-descriptions-item label="就绪状态">
            <el-tag :type="latestSnapshot.readinessStatus === 'complete' ? 'success' : 'warning'" size="small">
              {{ latestSnapshot.readinessStatus === 'complete' ? '已就绪' : '未就绪' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="latestSnapshot.readinessReasons?.length" label="未就绪原因" :span="2">
            {{ latestSnapshot.readinessReasons.join('；') }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <el-empty v-else description="执行查询后可创建快照" :image-size="60" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { traceabilityApi } from '@/api/traceability';
import type { TraceQueryResult } from '@/types/traceability';
import type { TraceContextSnapshotResult } from '@/api/traceability';
import ObjectTraceQueryPanel from './components/ObjectTraceQueryPanel.vue';
import ScenarioWorkbenchPanel from './components/ScenarioWorkbenchPanel.vue';
import TraceLedgerView from './components/TraceLedgerView.vue';
import TraceGraphView from './components/TraceGraphView.vue';
import TraceRiskPanel from './components/TraceRiskPanel.vue';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const activeEntry = ref<'object' | 'scenario'>('object');
const activeView = ref<'ledger' | 'graph'>('ledger');
const result = ref<TraceQueryResult | null>(null);
const error = ref('');
const snapshotBatchId = ref('');
const snapshotLoading = ref(false);
const latestSnapshot = ref<TraceContextSnapshotResult | null>(null);

const runObjectQuery = async (payload: Record<string, unknown>) => {
  error.value = '';
  try {
    result.value = (await traceabilityApi.query({
      ...payload,
      viewMode: activeView.value,
    } as any)) as TraceQueryResult;
  } catch {
    error.value = '查询失败，请检查对象编号是否正确';
  }
};

const runScenarioQuery = async (payload: Record<string, unknown>) => {
  error.value = '';
  try {
    if ((payload as any).scenario === 'materialBalance') {
      const balance = await traceabilityApi.materialBalance({
        productionBatchId:
          (payload as any).filters?.objectType === 'productionBatch'
            ? (payload as any).filters.objectId
            : undefined,
        materialLotId:
          (payload as any).filters?.objectType === 'materialLot'
            ? (payload as any).filters.objectId
            : undefined,
        timeMode: (payload as any).timeMode,
        asOfAt: (payload as any).asOfAt,
        includeEvidence: true,
        includeRecommendations: true,
      });
      result.value = null;
      ElMessage.success(`物料平衡分析完成：${balance.summary.status}`);
      return;
    }
    result.value = (await traceabilityApi.query({
      ...payload,
      viewMode: activeView.value,
    } as any)) as TraceQueryResult;
  } catch {
    error.value = '场景分析失败，请稍后重试';
  }
};

const createLinkage = async (actionType: string) => {
  if (!result.value) return;
  try {
    await traceabilityApi.createLinkage({
      actionType: actionType as any,
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

const createSnapshot = async (mode: 'preview' | 'export') => {
  const batchId = snapshotBatchId.value.trim();
  if (!batchId) {
    ElMessage.warning('请输入生产批次ID');
    return;
  }
  snapshotLoading.value = true;
  try {
    const fn =
      mode === 'export'
        ? () => traceabilityApi.exportProductionBatchEvidence(batchId)
        : () => traceabilityApi.previewProductionBatchTrace(batchId);
    const snapshot = await fn();
    latestSnapshot.value = snapshot;
    if (snapshot.readinessStatus === 'complete') {
      ElMessage.success(mode === 'export' ? '证据快照与导出已生成' : '预览快照已生成');
    } else {
      ElMessage.warning(
        `生成的是未就绪快照：${(snapshot.readinessReasons ?? []).join('；')}`,
      );
    }
  } catch {
    ElMessage.error('快照生成失败');
  } finally {
    snapshotLoading.value = false;
  }
};
</script>

<style scoped>
.traceability-query-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 24px;
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

.snapshot-preview-card {
  margin-top: 8px;
}

.snapshot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.snapshot-title {
  font-weight: 600;
  font-size: 14px;
}

.snapshot-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.snapshot-result {
  padding: 4px 0;
}
</style>
