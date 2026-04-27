<template>
  <div class="ii-list-page">
    <div class="page-header">
      <h1 class="page-title">来料检验</h1>
      <p class="page-subtitle">管理原料及包材的来料检验记录</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">检验记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建检验单
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="物料名称" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.material_batch?.material?.name ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="批次号" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.material_batch?.lot_number ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="供应商" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.material_batch?.supplier?.name ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="抽样数量" width="120">
          <template #default="{ row }">
            {{ row.sample_qty != null ? `${row.sample_qty} ${row.sample_unit ?? ''}`.trim() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="总体结论" width="130">
          <template #default="{ row }">
            <el-tag
              :type="getOverallResultTagType(row.overall_result)"
              effect="light"
              size="small"
            >
              {{ getOverallResultText(row.overall_result) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="检验项通过率" width="130">
          <template #default="{ row }">
            {{ calcPassRate(row.results) }}
          </template>
        </el-table-column>
        <el-table-column label="检验时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.inspected_at) }}
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.notes || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openReports(row)">报告</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建检验单对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建检验单"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="物料批次ID" prop="material_batch_id">
          <el-input v-model="createForm.material_batch_id" placeholder="请输入物料批次 ID" />
        </el-form-item>
        <el-form-item label="总体结论" prop="overall_result">
          <el-select v-model="createForm.overall_result" placeholder="请选择" style="width: 100%">
            <el-option label="合格" value="pass" />
            <el-option label="有条件合格" value="conditional_pass" />
            <el-option label="不合格" value="fail" />
          </el-select>
        </el-form-item>
        <el-form-item label="抽样数量">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input-number
              v-model="createForm.sample_qty"
              :min="0"
              placeholder="数量"
              style="flex: 1"
            />
            <el-input
              v-model="createForm.sample_unit"
              placeholder="单位，如：箱、kg"
              style="flex: 1"
            />
          </div>
        </el-form-item>
        <el-form-item label="处置方式">
          <el-input v-model="createForm.disposition" placeholder="例如：退货、让步接收" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="2"
            placeholder="可选"
          />
        </el-form-item>

        <!-- 动态检验项 -->
        <el-divider content-position="left">检验项明细</el-divider>
        <div
          v-for="(item, index) in createForm.results"
          :key="index"
          class="result-row"
        >
          <el-input
            v-model="item.item_name"
            placeholder="检验项名称"
            style="flex: 2"
          />
          <el-input
            v-model="item.actual_value"
            placeholder="实测值（可选）"
            style="flex: 2"
          />
          <el-select v-model="item.is_pass" placeholder="结果" style="flex: 1">
            <el-option label="通过" :value="true" />
            <el-option label="未通过" :value="false" />
          </el-select>
          <el-button
            type="danger"
            link
            :disabled="createForm.results.length <= 1"
            @click="removeResultRow(index)"
          >
            删除
          </el-button>
        </div>
        <el-button style="margin-top: 8px" @click="addResultRow">
          <el-icon><Plus /></el-icon>添加检验项
        </el-button>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reportsVisible" title="来料检验报告" width="860px">
      <el-table :data="inspectionReports" v-loading="reportsLoading" stripe>
        <el-table-column prop="reportName" label="报告类型" min-width="150" />
        <el-table-column prop="reportNo" label="报告编号" width="150" />
        <el-table-column label="检测日期" width="140">
          <template #default="{ row }">{{ row.testedAt ? formatDate(row.testedAt) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="conclusion" label="结论" width="110" />
        <el-table-column label="有效期" width="140">
          <template #default="{ row }">{{ row.expiresAt ? formatDate(row.expiresAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="reportStatusType(row.status)" size="small">
              {{ reportStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button link type="primary" @click="previewReport(row)">预览</el-button>
            <el-button link type="primary" @click="prepareReplaceReport(row)">换版</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="reportsVisible = false">关闭</el-button>
      </template>
      <input
        ref="replaceReportInputRef"
        class="hidden-file-input"
        type="file"
        accept="application/pdf"
        @change="handleReplaceReportFileChange"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import incomingInspectionApi, {
  type IncomingInspection,
  type InspectionResult,
  type InspectionReportDocument,
  getOverallResultText,
  getOverallResultTagType,
} from '@/api/incoming-inspection';
import filePreviewApi from '@/api/file-preview';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<IncomingInspection[]>([]);
const loading = ref(false);
const reportsVisible = ref(false);
const reportsLoading = ref(false);
const currentReportInspection = ref<IncomingInspection | null>(null);
const inspectionReports = ref<InspectionReportDocument[]>([]);
const replaceReportTarget = ref<InspectionReportDocument | null>(null);
const replaceReportInputRef = ref<HTMLInputElement>();

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

function defaultResultRow(): InspectionResult {
  return { item_name: '', actual_value: '', is_pass: true };
}

const createForm = reactive({
  material_batch_id: '',
  overall_result: '',
  sample_qty: undefined as number | undefined,
  sample_unit: '',
  disposition: '',
  notes: '',
  results: [defaultResultRow()] as InspectionResult[],
});

const createRules: FormRules = {
  material_batch_id: [{ required: true, message: '请输入物料批次 ID', trigger: 'blur' }],
  overall_result: [{ required: true, message: '请选择总体结论', trigger: 'change' }],
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

function calcPassRate(results: InspectionResult[]): string {
  if (!results || results.length === 0) return '-';
  const passed = results.filter((r) => r.is_pass).length;
  return `${passed} / ${results.length}`;
}

// ── Result rows ───────────────────────────────────────────────────────────────

function addResultRow() {
  createForm.results = [...createForm.results, defaultResultRow()];
}

function removeResultRow(index: number) {
  createForm.results = createForm.results.filter((_, i) => i !== index);
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const data = await incomingInspectionApi.getList();
    list.value = data as unknown as IncomingInspection[];
  } catch {
    ElMessage.error('加载来料检验列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.material_batch_id = '';
  createForm.overall_result = '';
  createForm.sample_qty = undefined;
  createForm.sample_unit = '';
  createForm.disposition = '';
  createForm.notes = '';
  createForm.results = [defaultResultRow()];
  createDialogVisible.value = true;
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await incomingInspectionApi.create({
      material_batch_id: createForm.material_batch_id,
      overall_result: createForm.overall_result,
      sample_qty: createForm.sample_qty,
      sample_unit: createForm.sample_unit || undefined,
      disposition: createForm.disposition || undefined,
      notes: createForm.notes || undefined,
      results: createForm.results.map((r) => ({
        item_name: r.item_name,
        actual_value: r.actual_value || undefined,
        is_pass: r.is_pass,
      })),
    });
    ElMessage.success('创建成功');
    createDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('新建失败，请重试');
  } finally {
    submitting.value = false;
  }
}

async function openReports(row: IncomingInspection) {
  currentReportInspection.value = row;
  reportsVisible.value = true;
  reportsLoading.value = true;
  try {
    inspectionReports.value = await incomingInspectionApi.getReports(row.id);
  } catch {
    ElMessage.error('加载来料检验报告失败');
  } finally {
    reportsLoading.value = false;
  }
}

async function previewReport(row: InspectionReportDocument) {
  try {
    const preview = await filePreviewApi.getPreviewInfo(row.documentId);
    if (preview.url) {
      window.open(preview.url, '_blank');
      return;
    }
    ElMessage.info(preview.message || '该文件暂不支持在线预览');
  } catch {
    ElMessage.error('获取预览失败');
  }
}

function prepareReplaceReport(row: InspectionReportDocument) {
  replaceReportTarget.value = row;
  replaceReportInputRef.value?.click();
}

async function handleReplaceReportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const inspection = currentReportInspection.value;
  const target = replaceReportTarget.value;
  input.value = '';
  if (!file || !inspection || !target) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('reportName', target.reportName);
  if (target.reportNo) formData.append('reportNo', target.reportNo);
  if (target.testedAt) formData.append('testedAt', target.testedAt);
  if (target.conclusion) formData.append('conclusion', target.conclusion);
  if (target.expiresAt) formData.append('expiresAt', target.expiresAt);

  reportsLoading.value = true;
  try {
    await incomingInspectionApi.replaceReport(inspection.id, target.id, formData);
    ElMessage.success('换版成功');
    inspectionReports.value = await incomingInspectionApi.getReports(inspection.id);
  } catch {
    ElMessage.error('换版失败');
  } finally {
    reportsLoading.value = false;
    replaceReportTarget.value = null;
  }
}

function reportStatusText(status: InspectionReportDocument['status']) {
  const map = { valid: '有效', expiring_soon: '即将到期', expired: '已过期' };
  return map[status] || status;
}

function reportStatusType(status: InspectionReportDocument['status']) {
  if (status === 'valid') return 'success';
  if (status === 'expired') return 'danger';
  return 'warning';
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.ii-list-page {
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

.result-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.hidden-file-input {
  display: none;
}
</style>
