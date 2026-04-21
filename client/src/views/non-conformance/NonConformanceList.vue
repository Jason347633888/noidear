<template>
  <div class="nc-list-page">
    <div class="page-header">
      <h1 class="page-title">不合格品管理</h1>
      <p class="page-subtitle">登记、追踪并处置不合格品</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">不合格品列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-select
              v-model="filterStatus"
              placeholder="全部状态"
              clearable
              style="width: 140px; margin-right: 12px"
              @change="loadList"
            >
              <el-option label="待处置" value="open" />
              <el-option label="已处置" value="dispositioned" />
              <el-option label="已关闭" value="closed" />
            </el-select>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建不合格品
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="nc_no" label="编号" width="180" />
        <el-table-column label="来源类型" width="120">
          <template #default="{ row }">
            {{ getNcSourceTypeText(row.source_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="source_id" label="来源 ID" width="180" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="数量" width="100">
          <template #default="{ row }">
            {{ row.qty != null ? `${row.qty} ${row.unit ?? ''}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="处置方式" width="120">
          <template #default="{ row }">
            {{ getNcDispositionText(row.disposition) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getNcStatusType(row.status)" effect="light" size="small">
              {{ getNcStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发现时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.discovered_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'open'"
              link
              type="primary"
              @click="openDisposeDialog(row)"
            >
              处置
            </el-button>
            <span v-else class="text-secondary">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建不合格品" width="520px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="来源类型" prop="source_type">
          <el-select v-model="createForm.source_type" placeholder="请选择" style="width: 100%">
            <el-option label="原料批次" value="material_batch" />
            <el-option label="生产批次" value="production_batch" />
            <el-option label="成品" value="product" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源 ID" prop="source_id">
          <el-input v-model="createForm.source_id" placeholder="请输入批次号或产品编号" />
        </el-form-item>
        <el-form-item label="不合格类型" prop="nc_type">
          <el-input v-model="createForm.nc_type" placeholder="例如：微生物超标、感官异常等" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请描述不合格情况"
          />
        </el-form-item>
        <el-form-item label="数量">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input-number
              v-model="createForm.qty"
              :min="0"
              :precision="2"
              placeholder="数量"
              style="flex: 1"
            />
            <el-input v-model="createForm.unit" placeholder="单位" style="width: 80px" />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>

    <!-- 处置对话框 -->
    <el-dialog v-model="disposeDialogVisible" title="处置不合格品" width="420px" :close-on-click-modal="false">
      <p style="margin-bottom: 16px; color: #606266">
        编号：<strong>{{ currentNc?.nc_no }}</strong>
      </p>
      <el-form ref="disposeFormRef" :model="disposeForm" :rules="disposeRules" label-width="100px">
        <el-form-item label="处置方式" prop="disposition">
          <el-select v-model="disposeForm.disposition" placeholder="请选择处置方式" style="width: 100%">
            <el-option label="返工" value="rework" />
            <el-option label="销毁" value="destroy" />
            <el-option label="让步接收" value="concession" />
            <el-option label="退货" value="return" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disposeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="disposing" @click="handleDispose">确认处置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import nonConformanceApi, {
  type NonConformance,
  type NcDisposition,
  getNcStatusText,
  getNcStatusType,
  getNcDispositionText,
  getNcSourceTypeText,
} from '@/api/non-conformance';

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<NonConformance[]>([]);
const loading = ref(false);
const filterStatus = ref<string>('');

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  source_type: '' as string,
  source_id: '',
  description: '',
  nc_type: '',
  qty: undefined as number | undefined,
  unit: '',
});

const createRules: FormRules = {
  source_type: [{ required: true, message: '请选择来源类型', trigger: 'change' }],
  source_id: [{ required: true, message: '请输入来源 ID', trigger: 'blur' }],
  description: [{ required: true, message: '请填写描述', trigger: 'blur' }],
};

// ── Dispose dialog ────────────────────────────────────────────────────────────

const disposeDialogVisible = ref(false);
const disposing = ref(false);
const disposeFormRef = ref<FormInstance>();
const currentNc = ref<NonConformance | null>(null);

const disposeForm = reactive({
  disposition: '' as NcDisposition | '',
});

const disposeRules: FormRules = {
  disposition: [{ required: true, message: '请选择处置方式', trigger: 'change' }],
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
  loading.value = true;
  try {
    const res = await nonConformanceApi.getList(filterStatus.value || undefined);
    list.value = res.data as unknown as NonConformance[];
  } catch {
    ElMessage.error('加载不合格品列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.source_type = '';
  createForm.source_id = '';
  createForm.description = '';
  createForm.nc_type = '';
  createForm.qty = undefined;
  createForm.unit = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await nonConformanceApi.create({
      source_type: createForm.source_type as NonConformance['source_type'],
      source_id: createForm.source_id,
      description: createForm.description,
      nc_type: createForm.nc_type || undefined,
      qty: createForm.qty,
      unit: createForm.unit || undefined,
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

// ── Dispose ───────────────────────────────────────────────────────────────────

function openDisposeDialog(nc: NonConformance) {
  currentNc.value = nc;
  disposeForm.disposition = '';
  disposeDialogVisible.value = true;
}

async function handleDispose() {
  await disposeFormRef.value?.validate();
  if (!currentNc.value) return;
  disposing.value = true;
  try {
    await nonConformanceApi.dispose(currentNc.value.id, {
      disposition: disposeForm.disposition as NcDisposition,
    });
    ElMessage.success('处置成功');
    disposeDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('处置失败，请重试');
  } finally {
    disposing.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.nc-list-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-count {
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}

.text-secondary {
  color: #c0c4cc;
  font-size: 13px;
}
</style>
