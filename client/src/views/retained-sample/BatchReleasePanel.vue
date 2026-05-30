<template>
  <div class="batch-release-panel">
    <PageHeaderBlock eyebrow="追溯与批次" title="批次放行">
      <template #description>
        查询批次放行条件是否满足，并在条件就绪后执行放行操作
      </template>
    </PageHeaderBlock>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">批次查询</h3>
      </div>
      <div class="app-panel--padded">
        <div style="display: flex; gap: 12px; align-items: flex-start">
          <el-input
            v-model="batchId"
            placeholder="请输入生产批次 ID"
            style="flex: 1; max-width: 360px"
            clearable
            @keyup.enter="checkReadiness"
          />
          <el-button type="primary" :loading="checkLoading" @click="checkReadiness">
            检查放行条件
          </el-button>
        </div>
      </div>
    </div>

    <!-- Readiness result -->
    <template v-if="readiness">
      <div class="app-panel" style="margin-bottom: 16px">
        <div class="app-panel-header">
          <h3 class="app-panel-header__title">放行条件检查结果</h3>
          <div class="app-panel-header__actions">
            <el-tag :type="readiness.ready ? 'success' : 'danger'" size="default">
              {{ readiness.ready ? '✓ 可以放行' : '✗ 存在阻塞项' }}
            </el-tag>
          </div>
        </div>
        <div class="app-panel--padded">
          <el-alert
            v-if="readiness.ready"
            title="所有放行条件均已满足，可以执行放行操作。"
            type="success"
            :closable="false"
            style="margin-bottom: 16px"
          />
          <template v-else>
            <el-alert
              :title="`存在 ${readiness.blockers.length} 个阻塞项，请处理后再放行。`"
              type="error"
              :closable="false"
              style="margin-bottom: 16px"
            />
            <el-table :data="readiness.blockers" stripe>
              <el-table-column label="阻塞类型" prop="code" width="260" show-overflow-tooltip />
              <el-table-column label="说明" prop="message" min-width="240" show-overflow-tooltip />
              <el-table-column label="关联资源" width="160" show-overflow-tooltip>
                <template #default="{ row }">
                  <span v-if="row.resourceType">
                    {{ row.resourceType }}
                    <span v-if="row.resourceId" style="font-size: 12px; color: #909399">
                      ({{ row.resourceId.slice(0, 8) }}...)
                    </span>
                  </span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>
          </template>

          <div v-if="readiness.ready" style="margin-top: 16px">
            <el-button
              type="success"
              :loading="releaseLoading"
              @click="confirmRelease"
            >
              执行放行
            </el-button>
          </div>
        </div>
      </div>
    </template>

    <!-- Release result -->
    <template v-if="releaseResult">
      <div class="app-panel" style="margin-bottom: 16px">
        <div class="app-panel-header">
          <h3 class="app-panel-header__title">放行结果</h3>
        </div>
        <div class="app-panel--padded">
          <el-alert title="批次放行成功！" type="success" :closable="false" />
          <el-descriptions :column="2" border style="margin-top: 16px">
            <el-descriptions-item label="批次ID">{{ releaseResult.id }}</el-descriptions-item>
            <el-descriptions-item label="批次号">{{ releaseResult.batchNumber }}</el-descriptions-item>
            <el-descriptions-item label="放行时间">{{ formatDate(releaseResult.released_at) }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import batchReleaseApi, { type ReleaseReadiness, type ReleasedBatch } from '@/api/batch-release';

// ── State ─────────────────────────────────────────────────────────────────────

const batchId = ref('');
const checkLoading = ref(false);
const releaseLoading = ref(false);
const readiness = ref<ReleaseReadiness | null>(null);
const releaseResult = ref<ReleasedBatch | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function checkReadiness() {
  if (!batchId.value.trim()) {
    ElMessage.warning('请输入批次 ID');
    return;
  }

  checkLoading.value = true;
  readiness.value = null;
  releaseResult.value = null;

  try {
    readiness.value = await batchReleaseApi.getReleaseReadiness(batchId.value.trim());
  } catch {
    ElMessage.error('检查放行条件失败，请确认批次 ID 正确');
  } finally {
    checkLoading.value = false;
  }
}

async function confirmRelease() {
  try {
    await ElMessageBox.confirm(
      `确认放行批次 ${batchId.value}？此操作不可撤销。`,
      '确认放行',
      { confirmButtonText: '确认放行', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }

  releaseLoading.value = true;
  try {
    releaseResult.value = await batchReleaseApi.releaseBatch(batchId.value.trim());
    ElMessage.success('批次放行成功');
    readiness.value = null;
  } catch {
    ElMessage.error('放行失败，请重试');
  } finally {
    releaseLoading.value = false;
  }
}
</script>

<style scoped>
.batch-release-panel {
  padding: 0 0 32px;
}
</style>
