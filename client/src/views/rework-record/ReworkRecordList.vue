<template>
  <div class="rr-list-page">
    <div class="page-header">
      <h1 class="page-title">回料/返工记录</h1>
      <p class="page-subtitle">管理生产过程中的回料与返工操作记录</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">返工记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="margin-right: 12px"
              @change="loadList"
            />
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建记录
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="production_batch_id" label="批次号" width="140" show-overflow-tooltip />
        <el-table-column prop="rework_reason" label="返工原因" min-width="160" show-overflow-tooltip />
        <el-table-column prop="rework_process" label="返工方法" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.rework_process || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="数量" width="120">
          <template #default="{ row }">
            {{ row.rework_qty }} {{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column label="返工日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.rework_date) }}
          </template>
        </el-table-column>
        <el-table-column label="质量判定" width="100">
          <template #default="{ row }">
            <el-tag :type="getVerdictTagType(row.quality_verdict)" effect="light" size="small">
              {{ getVerdictText(row.quality_verdict) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nc_id" label="关联不合格品" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.nc_id || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-popconfirm title="确认删除此记录？" @confirm="handleRemove(row.id)">
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建返工记录"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="生产批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="createForm.production_batch_id" />
        </el-form-item>
        <el-form-item label="返工原因" prop="rework_reason">
          <el-input
            v-model="createForm.rework_reason"
            type="textarea"
            :rows="2"
            placeholder="请描述返工原因"
          />
        </el-form-item>
        <el-form-item label="返工方法">
          <el-input
            v-model="createForm.rework_process"
            type="textarea"
            :rows="2"
            placeholder="可选，描述返工工艺或方法"
          />
        </el-form-item>
        <el-form-item label="返工数量" prop="rework_qty">
          <el-input-number
            v-model="createForm.rework_qty"
            :precision="4"
            :min="0"
            placeholder="数量"
            style="width: 60%"
          />
          <el-input
            v-model="createForm.unit"
            placeholder="单位"
            style="width: 38%; margin-left: 2%"
          />
        </el-form-item>
        <el-form-item label="返工日期" prop="rework_date">
          <el-date-picker
            v-model="createForm.rework_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择返工日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="质量判定" prop="quality_verdict">
          <el-radio-group v-model="createForm.quality_verdict">
            <el-radio value="pass">合格</el-radio>
            <el-radio value="fail">不合格</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="判定人">
          <el-input v-model="createForm.verdict_by" placeholder="可选" />
        </el-form-item>
        <el-form-item label="关联不合格品" prop="nc_id">
          <el-input v-model="createForm.nc_id" placeholder="请输入不合格品记录ID" />
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
import reworkRecordApi, { type ReworkRecord, getVerdictTagType, getVerdictText } from '@/api/rework-record';
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<ReworkRecord[]>([]);
const loading = ref(false);
const dateRange = ref<[string, string] | null>(null);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  production_batch_id: '',
  rework_reason: '',
  rework_process: '',
  rework_qty: undefined as number | undefined,
  unit: '',
  rework_date: '',
  quality_verdict: 'pass',
  verdict_by: '',
  nc_id: '',
});

const createRules: FormRules = {
  production_batch_id: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
  rework_reason: [{ required: true, message: '请输入返工原因', trigger: 'blur' }],
  rework_qty: [{ required: true, message: '请输入返工数量', trigger: 'blur' }],
  rework_date: [{ required: true, message: '请选择返工日期', trigger: 'change' }],
  quality_verdict: [{ required: true, message: '请选择质量判定', trigger: 'change' }],
  nc_id: [{ required: true, message: '请输入关联不合格品', trigger: 'blur' }],
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
    const [startDate, endDate] = dateRange.value ?? [undefined, undefined];
    const res = await reworkRecordApi.getList(startDate, endDate);
    list.value = res.data as unknown as ReworkRecord[];
  } catch {
    ElMessage.error('加载返工记录列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.production_batch_id = '';
  createForm.rework_reason = '';
  createForm.rework_process = '';
  createForm.rework_qty = undefined;
  createForm.unit = '';
  createForm.rework_date = '';
  createForm.quality_verdict = 'pass';
  createForm.verdict_by = '';
  createForm.nc_id = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await reworkRecordApi.create({
      production_batch_id: createForm.production_batch_id,
      rework_reason: createForm.rework_reason,
      rework_process: createForm.rework_process || undefined,
      rework_qty: createForm.rework_qty!,
      unit: createForm.unit,
      rework_date: createForm.rework_date,
      quality_verdict: createForm.quality_verdict,
      verdict_by: createForm.verdict_by || undefined,
      nc_id: createForm.nc_id,
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

// ── Remove ────────────────────────────────────────────────────────────────────

async function handleRemove(id: string) {
  try {
    await reworkRecordApi.remove(id);
    ElMessage.success('删除成功');
    await loadList();
  } catch {
    ElMessage.error('删除失败，请重试');
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.rr-list-page {
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
</style>
