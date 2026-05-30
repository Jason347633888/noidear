<template>
  <div class="rs-detail-page">
    <PageHeaderBlock eyebrow="质量与合规" :title="`留样详情 — ${sample?.sample_code ?? ''}`">
      <template #actions>
        <el-button @click="$router.back()">返回列表</el-button>
        <el-button
          v-if="sample && sample.status !== 'disposed'"
          type="warning"
          @click="openDisposeDialog"
        >
          标记处置
        </el-button>
        <el-button
          v-if="sample && sample.status !== 'disposed'"
          type="primary"
          @click="openInspectionDrawer"
        >
          新建检验
        </el-button>
      </template>
    </PageHeaderBlock>

    <div v-if="loading" style="padding: 32px 0">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else-if="sample">
      <!-- 基本信息 -->
      <div class="app-panel" style="margin-bottom: 16px">
        <div class="app-panel-header">
          <h3 class="app-panel-header__title">基本信息</h3>
        </div>
        <div class="app-panel--padded">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="留样编号">{{ sample.sample_code }}</el-descriptions-item>
            <el-descriptions-item label="样品类型">{{ SAMPLE_TYPE_LABEL[sample.sample_type] }}</el-descriptions-item>
            <el-descriptions-item label="数量">{{ sample.sample_qty }} {{ sample.unit }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="STATUS_TAG_TYPE[sample.status] ?? 'info'" size="small">
                {{ STATUS_LABEL[sample.status] ?? sample.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="留样时间">{{ formatDate(sample.retained_at) }}</el-descriptions-item>
            <el-descriptions-item label="保留期限">{{ sample.retention_period ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="到期时间">{{ sample.expires_at ? formatDate(sample.expires_at) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="储存条件">{{ sample.storage_condition ?? '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="sample.production_batch_id" label="关联生产批次">{{ sample.production_batch_id }}</el-descriptions-item>
            <el-descriptions-item v-if="sample.material_batch_id" label="关联物料批次">{{ sample.material_batch_id }}</el-descriptions-item>
            <el-descriptions-item v-if="sample.disposal_action" label="处置方式">{{ sample.disposal_action }}</el-descriptions-item>
            <el-descriptions-item v-if="sample.disposed_at" label="处置时间">{{ formatDate(sample.disposed_at) }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <!-- 检验记录 -->
      <div class="app-panel" style="margin-bottom: 16px">
        <div class="app-panel-header">
          <h3 class="app-panel-header__title">
            检验记录
            <span class="card-count">{{ sample.inspections.length }} 条</span>
          </h3>
        </div>
        <div class="app-panel--padded">
          <el-empty v-if="sample.inspections.length === 0" description="暂无检验记录" />
          <el-table v-else :data="sample.inspections" stripe>
            <el-table-column label="检验类型" prop="inspection_type" width="130" />
            <el-table-column label="检验记录ID" prop="inspection_record_id" min-width="200" show-overflow-tooltip />
            <el-table-column label="处置结果" min-width="150">
              <template #default="{ row }">
                {{ row.processed_disposition ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column label="处置时间" width="160">
              <template #default="{ row }">
                {{ row.processed_at ? formatDate(row.processed_at) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </template>

    <!-- 处置对话框 -->
    <el-dialog
      v-model="disposeDialogVisible"
      title="标记样品处置"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="disposeFormRef"
        :model="disposeForm"
        :rules="disposeRules"
        label-width="100px"
      >
        <el-form-item label="处置方式" prop="disposal_action">
          <el-input v-model="disposeForm.disposal_action" placeholder="如: 销毁、归还" style="width: 100%" />
        </el-form-item>
        <el-form-item label="处置时间" prop="disposed_at">
          <el-date-picker
            v-model="disposeForm.disposed_at"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disposeDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="submitting" @click="handleDispose">确认处置</el-button>
      </template>
    </el-dialog>

    <!-- 检验抽屉 -->
    <RetainedSampleInspectionDrawer
      v-if="sample && inspectionDrawerVisible"
      v-model="inspectionDrawerVisible"
      :sample="sample"
      @created="handleInspectionCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import RetainedSampleInspectionDrawer from './RetainedSampleInspectionDrawer.vue';
import retainedSampleApi, { type RetainedSample } from '@/api/retained-sample';

// ── Constants ─────────────────────────────────────────────────────────────────

const SAMPLE_TYPE_LABEL: Record<string, string> = {
  product: '成品',
  material: '物料',
  packaging: '包材',
};

const STATUS_LABEL: Record<string, string> = {
  retained: '在库',
  inspecting: '检验中',
  disposed: '已处置',
};

const STATUS_TAG_TYPE: Record<string, string> = {
  retained: 'success',
  inspecting: 'warning',
  disposed: 'info',
};

// ── State ─────────────────────────────────────────────────────────────────────

const route = useRoute();
const sample = ref<RetainedSample | null>(null);
const loading = ref(false);

const disposeDialogVisible = ref(false);
const submitting = ref(false);
const disposeFormRef = ref<FormInstance>();
const inspectionDrawerVisible = ref(false);

const disposeForm = ref({
  disposal_action: '',
  disposed_at: new Date().toISOString().slice(0, 19),
});

const disposeRules: FormRules = {
  disposal_action: [{ required: true, message: '请输入处置方式', trigger: 'blur' }],
  disposed_at: [{ required: true, message: '请选择处置时间', trigger: 'change' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadSample() {
  loading.value = true;
  try {
    sample.value = await retainedSampleApi.getById(route.params.id as string);
  } catch {
    ElMessage.error('加载留样详情失败');
  } finally {
    loading.value = false;
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

function openDisposeDialog() {
  disposeForm.value = { disposal_action: '', disposed_at: new Date().toISOString().slice(0, 19) };
  disposeDialogVisible.value = true;
}

async function handleDispose() {
  const valid = await disposeFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await retainedSampleApi.dispose(route.params.id as string, {
      disposal_action: disposeForm.value.disposal_action,
      disposed_at: disposeForm.value.disposed_at,
    });
    ElMessage.success('处置成功');
    disposeDialogVisible.value = false;
    await loadSample();
  } catch {
    ElMessage.error('操作失败，请重试');
  } finally {
    submitting.value = false;
  }
}

function openInspectionDrawer() {
  inspectionDrawerVisible.value = true;
}

async function handleInspectionCreated() {
  inspectionDrawerVisible.value = false;
  await loadSample();
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadSample();
});
</script>

<style scoped>
.rs-detail-page {
  padding: 0 0 32px;
}

.card-count {
  font-size: 13px;
  color: #909399;
  margin-left: 8px;
  font-weight: 400;
}
</style>
