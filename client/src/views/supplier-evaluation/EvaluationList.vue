<template>
  <div class="evaluation-list-page">
    <PageHeaderBlock eyebrow="质量与合规" title="供应商评估" description="定期评估供应商绩效，联动更新供应商资质状态" />

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">评估记录<span class="card-count">共 {{ list.length }} 条记录</span></h3>
        <div class="app-panel-header__actions">
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建评估
          </el-button>
        </div>
      </div>
      <div class="app-panel--padded">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="供应商" min-width="160">
          <template #default="{ row }">
            {{ row.supplier?.name ?? row.supplier_id }}
          </template>
        </el-table-column>
        <el-table-column prop="eval_period" label="评估周期" width="120" />
        <el-table-column label="质量评分" width="100" align="center">
          <template #default="{ row }">
            {{ row.quality_score != null ? Number(row.quality_score).toFixed(1) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="交付评分" width="100" align="center">
          <template #default="{ row }">
            {{ row.delivery_score != null ? Number(row.delivery_score).toFixed(1) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="服务评分" width="100" align="center">
          <template #default="{ row }">
            {{ row.service_score != null ? Number(row.service_score).toFixed(1) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="综合得分" width="100" align="center">
          <template #default="{ row }">
            <strong v-if="row.total_score != null">{{ Number(row.total_score).toFixed(1) }}</strong>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="评估结论" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="getVerdictType(row.verdict)" effect="light" size="small">
              {{ getVerdictText(row.verdict) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="评估日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.eval_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.notes ?? '-' }}
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 新建评估对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建供应商评估"
      width="540px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item label="供应商 ID" prop="supplier_id">
          <el-input v-model="createForm.supplier_id" placeholder="请输入供应商 ID" />
        </el-form-item>
        <el-form-item label="评估周期" prop="eval_period">
          <el-input v-model="createForm.eval_period" placeholder="如 2026-Q1" />
        </el-form-item>
        <el-form-item label="质量评分">
          <el-input-number
            v-model="createForm.quality_score"
            :min="0"
            :max="100"
            :precision="1"
            placeholder="0~100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="交付评分">
          <el-input-number
            v-model="createForm.delivery_score"
            :min="0"
            :max="100"
            :precision="1"
            placeholder="0~100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="服务评分">
          <el-input-number
            v-model="createForm.service_score"
            :min="0"
            :max="100"
            :precision="1"
            placeholder="0~100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="评估结论" prop="verdict">
          <el-select v-model="createForm.verdict" placeholder="请选择" style="width: 100%">
            <el-option label="合格" value="approved" />
            <el-option label="有条件合格" value="conditional" />
            <el-option label="淘汰" value="eliminated" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="3"
            placeholder="可填写评估说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import supplierEvaluationApi, {
  type SupplierEvaluation,
  type EvaluationVerdict,
  getVerdictText,
  getVerdictType,
} from '@/api/supplier-evaluation';
import { toList } from '@/utils/apiResponse';

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<SupplierEvaluation[]>([]);
const loading = ref(false);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  supplier_id: '',
  eval_period: '',
  quality_score: undefined as number | undefined,
  delivery_score: undefined as number | undefined,
  service_score: undefined as number | undefined,
  verdict: '' as EvaluationVerdict | '',
  notes: '',
});

const createRules: FormRules = {
  supplier_id: [{ required: true, message: '请输入供应商 ID', trigger: 'blur' }],
  eval_period: [{ required: true, message: '请输入评估周期', trigger: 'blur' }],
  verdict: [{ required: true, message: '请选择评估结论', trigger: 'change' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await supplierEvaluationApi.getList();
    list.value = toList<SupplierEvaluation>(res);
  } catch {
    ElMessage.error('加载评估记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.supplier_id = '';
  createForm.eval_period = '';
  createForm.quality_score = undefined;
  createForm.delivery_score = undefined;
  createForm.service_score = undefined;
  createForm.verdict = '';
  createForm.notes = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await supplierEvaluationApi.create({
      supplier_id: createForm.supplier_id,
      eval_period: createForm.eval_period,
      quality_score: createForm.quality_score,
      delivery_score: createForm.delivery_score,
      service_score: createForm.service_score,
      verdict: createForm.verdict as EvaluationVerdict,
      notes: createForm.notes || undefined,
    });
    ElMessage.success('评估提交成功，供应商状态已同步更新');
    createDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('提交失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.evaluation-list-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-count {
  font-size: 13px;
  color: #909399;
  margin-left: 12px;
  font-weight: 400;
}
</style>
