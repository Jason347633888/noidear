<template>
  <div class="evidence-export-center">
    <PageHeaderBlock
      eyebrow="追溯与批次"
      title="证据导出中心"
      description="生成正式证据包或预览快照，用于审计、召回与合规检查"
    />

    <div class="action-bar">
      <el-card class="action-card">
        <template #header>
          <span class="action-card-title">生成批次证据包</span>
        </template>
        <el-form label-width="110px">
          <el-form-item label="生产批次ID">
            <el-input
              v-model="exportForm.batchId"
              placeholder="请输入生产批次ID"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item label="最大追溯深度">
            <el-input-number
              v-model="exportForm.maxDepth"
              :min="1"
              :max="10"
              :step="1"
              style="width: 120px"
            />
          </el-form-item>
        </el-form>
        <div class="action-buttons">
          <el-button
            :loading="exportLoading"
            @click="runExport('preview')"
          >预览快照（不生成文件）</el-button>
          <el-button
            type="primary"
            :loading="exportLoading"
            @click="runExport('formal')"
          >生成正式证据包</el-button>
        </div>
        <el-alert
          v-if="exportResult"
          :type="exportResult.readinessStatus === 'complete' ? 'success' : 'warning'"
          :title="exportResult.readinessStatus === 'complete' ? '证据包已就绪' : '生成了预览快照（未就绪）'"
          show-icon
          :closable="false"
          style="margin-top: 12px"
        >
          <template #default>
            <div class="export-result-detail">
              <span>快照ID：{{ exportResult.id }}</span>
              <span v-if="exportResult.evidenceExportId">
                导出ID：{{ exportResult.evidenceExportId }}
              </span>
              <span v-if="exportResult.readinessReasons?.length">
                未就绪原因：{{ exportResult.readinessReasons.join('；') }}
              </span>
            </div>
          </template>
        </el-alert>
      </el-card>

      <el-card class="action-card">
        <template #header>
          <span class="action-card-title">从快照生成证据包</span>
        </template>
        <el-form label-width="110px">
          <el-form-item label="快照ID">
            <el-input
              v-model="snapshotExportForm.snapshotId"
              placeholder="请输入已完成的快照ID"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item label="模板版本">
            <el-input
              v-model="snapshotExportForm.templateVersion"
              placeholder="可选，如 v1"
              style="width: 120px"
            />
          </el-form-item>
        </el-form>
        <div class="action-buttons">
          <el-button
            type="primary"
            :loading="snapshotExportLoading"
            @click="runSnapshotExport"
          >从快照导出</el-button>
        </div>
      </el-card>
    </div>

    <el-card class="export-list-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">导出记录</span>
            <span class="card-count">共 {{ exportList.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-select
              v-model="filterStatus"
              placeholder="全部状态"
              clearable
              style="width: 140px; margin-right: 12px"
              @change="loadExportList"
            >
              <el-option label="排队中" value="queued" />
              <el-option label="生成中" value="building" />
              <el-option label="已就绪" value="ready" />
              <el-option label="失败" value="failed" />
              <el-option label="已过期" value="expired" />
            </el-select>
            <el-button :loading="listLoading" @click="loadExportList">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="exportList" v-loading="listLoading" stripe>
        <el-table-column prop="id" label="导出ID" width="200" show-overflow-tooltip />
        <el-table-column prop="snapshot_id" label="快照ID" width="200" show-overflow-tooltip />
        <el-table-column label="就绪状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.readiness_status === 'complete' ? 'success' : 'warning'" size="small">
              {{ row.readiness_status === 'complete' ? '已就绪' : '未就绪' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="exportStatusTagType(row.status)" size="small">
              {{ EXPORT_STATUS_MAP[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="template_version" label="模板版本" width="100">
          <template #default="{ row }">{{ row.template_version ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.readiness_status === 'complete'"
              type="primary"
              link
              :loading="downloadingId === row.id"
              @click="handleDownload(row.id)"
            >下载</el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { evidenceExportApi, type EvidenceExport, type EvidenceExportStatus } from '@/api/evidence-export';
import { traceabilityApi } from '@/api/traceability';
import type { TraceContextSnapshotResult } from '@/api/traceability';
import { toList } from '@/utils/apiResponse';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const EXPORT_STATUS_MAP: Record<string, string> = {
  queued: '排队中',
  building: '生成中',
  ready: '已就绪',
  failed: '失败',
  expired: '已过期',
};

const exportForm = ref({ batchId: '', maxDepth: 5 });
const snapshotExportForm = ref({ snapshotId: '', templateVersion: '' });
const exportLoading = ref(false);
const snapshotExportLoading = ref(false);
const exportResult = ref<TraceContextSnapshotResult | null>(null);
const exportList = ref<EvidenceExport[]>([]);
const listLoading = ref(false);
const filterStatus = ref('');
const downloadingId = ref('');

function exportStatusTagType(status: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    queued: 'info',
    building: 'warning',
    ready: 'success',
    failed: 'danger',
    expired: 'info',
  };
  return map[status] ?? '';
}

function formatDate(date: string): string {
  return date ? new Date(date).toLocaleString('zh-CN') : '-';
}

async function runExport(mode: 'preview' | 'formal') {
  const batchId = exportForm.value.batchId.trim();
  if (!batchId) {
    ElMessage.warning('请输入生产批次ID');
    return;
  }
  exportLoading.value = true;
  try {
    const fn =
      mode === 'formal'
        ? () => traceabilityApi.exportProductionBatchEvidence(batchId, { maxDepth: exportForm.value.maxDepth })
        : () => traceabilityApi.previewProductionBatchTrace(batchId, { maxDepth: exportForm.value.maxDepth });
    const result = await fn();
    exportResult.value = result;
    if (result.readinessStatus === 'complete') {
      ElMessage.success(mode === 'formal' ? '正式证据包已生成' : '预览快照已生成');
    } else {
      ElMessage.warning(`生成了未就绪快照：${(result.readinessReasons ?? []).join('；')}`);
    }
    await loadExportList();
  } catch {
    ElMessage.error('操作失败，请重试');
  } finally {
    exportLoading.value = false;
  }
}

async function runSnapshotExport() {
  const snapshotId = snapshotExportForm.value.snapshotId.trim();
  if (!snapshotId) {
    ElMessage.warning('请输入快照ID');
    return;
  }
  snapshotExportLoading.value = true;
  try {
    await evidenceExportApi.exportFromSnapshot(snapshotId, {
      templateVersion: snapshotExportForm.value.templateVersion || undefined,
    });
    ElMessage.success('证据包已从快照生成');
    await loadExportList();
  } catch {
    ElMessage.error('从快照生成失败，请确认快照已就绪');
  } finally {
    snapshotExportLoading.value = false;
  }
}

async function loadExportList() {
  listLoading.value = true;
  try {
    const res = await evidenceExportApi.getList({
      status: filterStatus.value as EvidenceExportStatus || undefined,
    });
    exportList.value = toList<EvidenceExport>(res);
  } catch {
    ElMessage.error('加载导出记录失败');
  } finally {
    listLoading.value = false;
  }
}

async function handleDownload(exportId: string) {
  downloadingId.value = exportId;
  try {
    const blob = await evidenceExportApi.download(exportId) as unknown as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-export-${exportId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('下载已开始');
  } catch {
    ElMessage.error('下载失败');
  } finally {
    downloadingId.value = '';
  }
}

onMounted(loadExportList);
</script>

<style scoped>
.evidence-export-center {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.action-card-title {
  font-weight: 600;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.export-result-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.export-list-card {
  margin-top: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.card-count {
  font-size: 12px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}
</style>
