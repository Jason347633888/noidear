<template>
  <div class="drill-detail-page" v-loading="loading">
    <div v-if="drill" class="page-header">
      <div class="header-left">
        <el-button link @click="$router.back()">← 返回</el-button>
        <span class="drill-label">{{ drillTypeLabel(drill.drill_type) }}</span>
        <el-tag :type="statusTagType(drill.status)" size="small">{{ statusLabel(drill.status) }}</el-tag>
        <el-tag
          v-if="drill.conclusion"
          :type="drill.conclusion === 'passed' ? 'success' : 'danger'"
          size="small"
          class="ml-8"
        >
          {{ drill.conclusion === 'passed' ? '结论：通过' : '结论：未通过' }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-button
          v-if="drill.status === 'planned'"
          type="primary"
          :loading="actionLoading"
          @click="handleStart"
        >开始演练</el-button>
        <el-button
          v-if="drill.status === 'in_progress'"
          :loading="actionLoading"
          @click="openAttachSnapshotDialog"
        >挂载快照</el-button>
        <el-button
          v-if="drill.status === 'in_progress'"
          type="success"
          :loading="actionLoading"
          :disabled="!drill.traceability_snapshot_id"
          @click="openConcludeDialog"
        >结案</el-button>
        <el-button
          v-if="drill.conclusion === 'failed' && !drill.capa_id"
          type="warning"
          :loading="actionLoading"
          @click="handleCreateCapa"
        >创建 CAPA</el-button>
      </div>
    </div>

    <template v-if="drill">
      <el-card class="section-card">
        <template #header><span>演练信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="追溯类型">{{ drillTypeLabel(drill.drill_type) }}</el-descriptions-item>
          <el-descriptions-item label="演练日期">{{ formatDate(drill.drill_date) }}</el-descriptions-item>
          <el-descriptions-item label="根对象类型">{{ drill.root_object_type }}</el-descriptions-item>
          <el-descriptions-item label="根对象ID">{{ drill.root_object_id }}</el-descriptions-item>
          <el-descriptions-item label="计划开始">{{ formatDate(drill.planned_start) }}</el-descriptions-item>
          <el-descriptions-item label="计划结束">{{ formatDate(drill.planned_end) }}</el-descriptions-item>
          <el-descriptions-item label="实际开始">{{ formatDate(drill.actual_start) }}</el-descriptions-item>
          <el-descriptions-item label="实际结束">{{ formatDate(drill.actual_end) }}</el-descriptions-item>
          <el-descriptions-item label="模拟场景" :span="2">{{ drill.simulated_case ?? '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="section-card">
        <template #header><span>快照与结案</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="挂载快照ID">
            {{ drill.traceability_snapshot_id ?? '暂未挂载' }}
          </el-descriptions-item>
          <el-descriptions-item label="结论">
            <el-tag
              v-if="drill.conclusion"
              :type="drill.conclusion === 'passed' ? 'success' : 'danger'"
              size="small"
            >
              {{ drill.conclusion === 'passed' ? '通过' : '未通过' }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="结案时间">{{ formatDate(drill.conclusion_at) }}</el-descriptions-item>
          <el-descriptions-item label="关联CAPA">
            <el-button
              v-if="drill.capa_id"
              type="primary"
              link
              @click="goCapa(drill.capa_id!)"
            >{{ drill.capa_id }}</el-button>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </template>

    <el-dialog
      v-model="attachDialog.visible"
      title="挂载追溯快照"
      width="440px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px">
        <el-form-item label="快照ID" required>
          <el-input v-model="attachDialog.snapshotId" placeholder="请输入追溯快照ID" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="attachDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="handleAttachSnapshot">确认挂载</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="concludeDialog.visible"
      title="演练结案"
      width="440px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="结论" required>
          <el-radio-group v-model="concludeDialog.conclusion">
            <el-radio value="passed">通过</el-radio>
            <el-radio value="failed">未通过</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="concludeDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="handleConclude">确认结案</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { traceabilityDrillApi, type TraceabilityDrill, type DrillConclusion } from '@/api/traceability-drill';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const actionLoading = ref(false);
const drill = ref<TraceabilityDrill | null>(null);

const attachDialog = ref({ visible: false, snapshotId: '' });
const concludeDialog = ref({ visible: false, conclusion: 'passed' as DrillConclusion });

function drillTypeLabel(type: string): string {
  const map: Record<string, string> = {
    forward: '正向追溯',
    backward: '逆向追溯',
    both: '双向追溯',
  };
  return map[type] ?? type;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    planned: '已计划',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] ?? status;
}

function statusTagType(status: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    planned: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'info',
  };
  return map[status] ?? '';
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}

async function loadDetail() {
  loading.value = true;
  try {
    const res = await traceabilityDrillApi.getDetail(route.params.id as string);
    drill.value = (res as any).data ?? res;
  } catch {
    ElMessage.error('加载演练详情失败');
  } finally {
    loading.value = false;
  }
}

async function handleStart() {
  actionLoading.value = true;
  try {
    await traceabilityDrillApi.start(route.params.id as string);
    ElMessage.success('演练已开始');
    await loadDetail();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    actionLoading.value = false;
  }
}

function openAttachSnapshotDialog() {
  attachDialog.value = { visible: true, snapshotId: '' };
}

async function handleAttachSnapshot() {
  if (!attachDialog.value.snapshotId.trim()) {
    ElMessage.warning('请输入快照ID');
    return;
  }
  actionLoading.value = true;
  try {
    await traceabilityDrillApi.attachSnapshot(
      route.params.id as string,
      attachDialog.value.snapshotId.trim(),
    );
    ElMessage.success('快照已挂载');
    attachDialog.value.visible = false;
    await loadDetail();
  } catch {
    ElMessage.error('挂载失败');
  } finally {
    actionLoading.value = false;
  }
}

function openConcludeDialog() {
  concludeDialog.value = { visible: true, conclusion: 'passed' };
}

async function handleConclude() {
  actionLoading.value = true;
  try {
    await traceabilityDrillApi.conclude(route.params.id as string, concludeDialog.value.conclusion);
    ElMessage.success('结案成功');
    concludeDialog.value.visible = false;
    await loadDetail();
  } catch {
    ElMessage.error('结案失败，请确认快照已就绪');
  } finally {
    actionLoading.value = false;
  }
}

async function handleCreateCapa() {
  actionLoading.value = true;
  try {
    await traceabilityDrillApi.createCapa(route.params.id as string);
    ElMessage.success('CAPA 已创建');
    await loadDetail();
  } catch {
    ElMessage.error('创建 CAPA 失败');
  } finally {
    actionLoading.value = false;
  }
}

function goCapa(capaId: string) {
  router.push({ name: 'CapaDetail', params: { id: capaId } });
}

onMounted(loadDetail);
</script>

<style scoped>
.drill-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drill-label {
  font-size: 16px;
  font-weight: 600;
}

.ml-8 {
  margin-left: 8px;
}

.section-card {
  margin-top: 0;
}
</style>
