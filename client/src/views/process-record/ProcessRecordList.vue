<template>
  <div class="process-record-page">
    <PageHeaderBlock eyebrow="设备与现场" title="过程参数监控" description="记录和追踪生产过程中的关键参数" />

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">参数记录列表<span class="card-count">共 {{ list.length }} 条记录</span></h3>
        <div class="app-panel-header__actions">
          <div style="width: 260px; margin-right: 12px">
            <ProductionBatchSelect v-model="filterBatchId" @update:model-value="loadList" />
          </div>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建记录
          </el-button>
        </div>
      </div>
      <div class="app-panel--padded">

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="production_batch_id" label="生产批次 ID" width="200" show-overflow-tooltip />
        <el-table-column prop="param_name" label="参数名称" width="140" />
        <el-table-column label="参数值" width="120">
          <template #default="{ row }">
            {{ row.param_value != null ? `${row.param_value} ${row.unit ?? ''}` : row.param_text ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="是否合规" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_within_spec ? 'success' : 'danger'" effect="light" size="small">
              {{ row.is_within_spec ? '合规' : '异常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="abnormal_action" label="异常处置" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.abnormal_action ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="记录时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.measured_at) }}
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 新建对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建过程参数记录" width="520px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <el-form-item label="生产批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="createForm.production_batch_id" />
        </el-form-item>
        <el-form-item label="参数名称" prop="param_name">
          <el-input v-model="createForm.param_name" placeholder="例如：中心温度、pH值" />
        </el-form-item>
        <el-form-item label="参数数值">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input-number
              v-model="createForm.param_value"
              :precision="4"
              placeholder="数值"
              style="flex: 1"
            />
            <el-input v-model="createForm.unit" placeholder="单位" style="width: 80px" />
          </div>
        </el-form-item>
        <el-form-item label="文本描述">
          <el-input v-model="createForm.param_text" placeholder="可填写文字描述（可选）" />
        </el-form-item>
        <el-form-item label="是否合规" prop="is_within_spec">
          <el-radio-group v-model="createForm.is_within_spec">
            <el-radio :value="true">合规</el-radio>
            <el-radio :value="false">异常</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!createForm.is_within_spec" label="异常处置">
          <el-input
            v-model="createForm.abnormal_action"
            type="textarea"
            :rows="2"
            placeholder="请描述异常处置措施"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import processRecordApi, { type ProcessRecord } from '@/api/process-record';
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';
import { toList } from '@/utils/apiResponse';

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<ProcessRecord[]>([]);
const loading = ref(false);
const filterBatchId = ref('');

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  production_batch_id: '',
  param_name: '',
  param_value: undefined as number | undefined,
  unit: '',
  param_text: '',
  is_within_spec: true,
  abnormal_action: '',
});

const createRules: FormRules = {
  production_batch_id: [{ required: true, message: '请输入生产批次 ID', trigger: 'blur' }],
  param_name: [{ required: true, message: '请输入参数名称', trigger: 'blur' }],
  is_within_spec: [{ required: true, message: '请选择是否合规', trigger: 'change' }],
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

async function loadList() {
  if (!filterBatchId.value) {
    list.value = [];
    return;
  }
  loading.value = true;
  try {
    const res = await processRecordApi.getByBatch(filterBatchId.value);
    list.value = toList<ProcessRecord>(res);
  } catch {
    ElMessage.error('加载记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.production_batch_id = filterBatchId.value;
  createForm.param_name = '';
  createForm.param_value = undefined;
  createForm.unit = '';
  createForm.param_text = '';
  createForm.is_within_spec = true;
  createForm.abnormal_action = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await processRecordApi.create({
      production_batch_id: createForm.production_batch_id,
      param_name: createForm.param_name,
      param_value: createForm.param_value,
      unit: createForm.unit || undefined,
      param_text: createForm.param_text || undefined,
      is_within_spec: createForm.is_within_spec,
      abnormal_action: createForm.abnormal_action || undefined,
    });
    ElMessage.success('新建成功');
    createDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('新建失败，请重试');
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
.process-record-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-count {
  font-size: 13px;
  color: #909399;
}
</style>
