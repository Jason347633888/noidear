<template>
  <div class="equipment-list-page">
    <PageHeaderBlock eyebrow="设备与现场" title="测量设备管理" description="管理测量设备台账及校准记录" />

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">设备列表<span class="card-count">共 {{ list.length }} 台设备</span>
          <el-tag v-if="overdueCount > 0" type="danger" effect="light" size="small">
            {{ overdueCount }} 台逾期
          </el-tag>
        </h3>
        <div class="app-panel-header__actions">
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建设备
          </el-button>
        </div>
      </div>
      <div class="app-panel--padded">
      <el-table :data="list" v-loading="loading" stripe :row-class-name="rowClassName">
        <el-table-column prop="code" label="设备编号" width="140" />
        <el-table-column prop="name" label="设备名称" min-width="160" />
        <el-table-column prop="location" label="存放位置" width="140">
          <template #default="{ row }">{{ row.location ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getEquipmentStatusType(row.status)" effect="light" size="small">
              {{ getEquipmentStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上次校准" width="130">
          <template #default="{ row }">{{ formatDate(row.last_calibrated_at) }}</template>
        </el-table-column>
        <el-table-column label="下次校准" width="130">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isOverdue(row.next_calibration_at) }">
              {{ formatDate(row.next_calibration_at) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openCalibrationDialog(row)">添加校准</el-button>
            <el-button link type="info" @click="viewCalibrations(row)">记录</el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 新建设备 dialog -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建测量设备"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="设备编号" prop="code">
          <el-input v-model="createForm.code" placeholder="请输入设备编号" />
        </el-form-item>
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="createForm.model" placeholder="请输入型号（可选）" />
        </el-form-item>
        <el-form-item label="序列号">
          <el-input v-model="createForm.serial_no" placeholder="请输入序列号（可选）" />
        </el-form-item>
        <el-form-item label="存放位置">
          <el-input v-model="createForm.location" placeholder="请输入存放位置（可选）" />
        </el-form-item>
        <el-form-item label="校准周期(天)">
          <el-input-number
            v-model="createForm.calibration_cycle_days"
            :min="1"
            :precision="0"
            placeholder="天数"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>

    <!-- 添加校准记录 dialog -->
    <el-dialog
      v-model="calibrationDialogVisible"
      title="添加校准记录"
      width="520px"
      :close-on-click-modal="false"
    >
      <p style="margin-bottom: 16px; color: #606266">
        设备：<strong>{{ currentEquipment?.name }}（{{ currentEquipment?.code }}）</strong>
      </p>
      <el-form
        ref="calibrationFormRef"
        :model="calibrationForm"
        :rules="calibrationRules"
        label-width="110px"
      >
        <el-form-item label="校准日期" prop="calibrated_at">
          <el-date-picker
            v-model="calibrationForm.calibrated_at"
            type="date"
            placeholder="选择校准日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="有效期至" prop="valid_until">
          <el-date-picker
            v-model="calibrationForm.valid_until"
            type="date"
            placeholder="选择有效期截止日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="校准结果" prop="result">
          <el-select v-model="calibrationForm.result" placeholder="请选择校准结果" style="width: 100%">
            <el-option label="合格" value="pass" />
            <el-option label="不合格" value="fail" />
            <el-option label="有条件合格" value="conditional" />
          </el-select>
        </el-form-item>
        <el-form-item label="校准机构">
          <el-input v-model="calibrationForm.calibration_body" placeholder="请输入校准机构名称（可选）" />
        </el-form-item>
        <el-form-item label="证书编号">
          <el-input v-model="calibrationForm.certificate_no" placeholder="请输入证书编号（可选）" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="calibrationForm.notes"
            type="textarea"
            :rows="2"
            placeholder="备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="calibrationDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingCalibration" @click="handleCreateCalibration">
          确认添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 校准记录历史 dialog -->
    <el-dialog
      v-model="historyDialogVisible"
      :title="`校准历史 — ${currentEquipment?.name ?? ''}`"
      width="680px"
    >
      <el-table :data="calibrationHistory" v-loading="loadingHistory" stripe>
        <el-table-column label="校准日期" width="120">
          <template #default="{ row }">{{ formatDate(row.calibrated_at) }}</template>
        </el-table-column>
        <el-table-column label="有效期至" width="120">
          <template #default="{ row }">{{ formatDate(row.valid_until) }}</template>
        </el-table-column>
        <el-table-column label="结果" width="120">
          <template #default="{ row }">
            <el-tag :type="getCalibrationResultType(row.result)" effect="light" size="small">
              {{ getCalibrationResultText(row.result) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="calibration_body" label="校准机构" min-width="140">
          <template #default="{ row }">{{ row.calibration_body ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="certificate_no" label="证书编号" width="140">
          <template #default="{ row }">{{ row.certificate_no ?? '-' }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import measuringEquipmentApi, {
  type MeasuringEquipment,
  type CalibrationRecord,
  getEquipmentStatusText,
  getEquipmentStatusType,
  getCalibrationResultText,
  getCalibrationResultType,
} from '@/api/measuring-equipment';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<MeasuringEquipment[]>([]);
const loading = ref(false);

const overdueCount = computed(
  () => list.value.filter((e) => isOverdue(e.next_calibration_at)).length,
);

// ── Create equipment dialog ───────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  code: '',
  name: '',
  model: '',
  serial_no: '',
  location: '',
  calibration_cycle_days: undefined as number | undefined,
});

const createRules: FormRules = {
  code: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
};

// ── Add calibration dialog ────────────────────────────────────────────────────

const calibrationDialogVisible = ref(false);
const submittingCalibration = ref(false);
const calibrationFormRef = ref<FormInstance>();
const currentEquipment = ref<MeasuringEquipment | null>(null);

const calibrationForm = reactive({
  calibrated_at: '',
  valid_until: '',
  result: '' as string,
  calibration_body: '',
  certificate_no: '',
  notes: '',
});

const calibrationRules: FormRules = {
  calibrated_at: [{ required: true, message: '请选择校准日期', trigger: 'change' }],
  valid_until: [{ required: true, message: '请选择有效期截止日期', trigger: 'change' }],
  result: [{ required: true, message: '请选择校准结果', trigger: 'change' }],
};

// ── Calibration history dialog ────────────────────────────────────────────────

const historyDialogVisible = ref(false);
const loadingHistory = ref(false);
const calibrationHistory = ref<CalibrationRecord[]>([]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function isOverdue(nextCalibrationAt: string | null): boolean {
  if (!nextCalibrationAt) return false;
  return new Date(nextCalibrationAt) < new Date();
}

function rowClassName({ row }: { row: MeasuringEquipment }): string {
  return isOverdue(row.next_calibration_at) ? 'row-overdue' : '';
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await measuringEquipmentApi.getList();
    list.value = res.data as unknown as MeasuringEquipment[];
  } catch {
    ElMessage.error('加载设备列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create equipment ──────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.code = '';
  createForm.name = '';
  createForm.model = '';
  createForm.serial_no = '';
  createForm.location = '';
  createForm.calibration_cycle_days = undefined;
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await measuringEquipmentApi.create({
      code: createForm.code,
      name: createForm.name,
      model: createForm.model || undefined,
      serial_no: createForm.serial_no || undefined,
      location: createForm.location || undefined,
      calibration_cycle_days: createForm.calibration_cycle_days,
    });
    ElMessage.success('新建设备成功');
    createDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('新建设备失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Add calibration ───────────────────────────────────────────────────────────

function openCalibrationDialog(equipment: MeasuringEquipment) {
  currentEquipment.value = equipment;
  calibrationForm.calibrated_at = '';
  calibrationForm.valid_until = '';
  calibrationForm.result = '';
  calibrationForm.calibration_body = '';
  calibrationForm.certificate_no = '';
  calibrationForm.notes = '';
  calibrationDialogVisible.value = true;
}

async function handleCreateCalibration() {
  await calibrationFormRef.value?.validate();
  if (!currentEquipment.value) return;
  submittingCalibration.value = true;
  try {
    await measuringEquipmentApi.createCalibration({
      measuring_equipment_id: currentEquipment.value.id,
      calibrated_at: calibrationForm.calibrated_at,
      valid_until: calibrationForm.valid_until,
      result: calibrationForm.result as 'pass' | 'fail' | 'conditional',
      calibration_body: calibrationForm.calibration_body || undefined,
      certificate_no: calibrationForm.certificate_no || undefined,
      notes: calibrationForm.notes || undefined,
    });
    ElMessage.success('校准记录添加成功');
    calibrationDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('添加校准记录失败，请重试');
  } finally {
    submittingCalibration.value = false;
  }
}

// ── Calibration history ───────────────────────────────────────────────────────

async function viewCalibrations(equipment: MeasuringEquipment) {
  currentEquipment.value = equipment;
  historyDialogVisible.value = true;
  loadingHistory.value = true;
  try {
    const res = await measuringEquipmentApi.getCalibrations(equipment.id);
    calibrationHistory.value = res.data as unknown as CalibrationRecord[];
  } catch {
    ElMessage.error('加载校准历史失败');
  } finally {
    loadingHistory.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.equipment-list-page {
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

.text-danger {
  color: #f56c6c;
  font-weight: 500;
}

:deep(.row-overdue) {
  background-color: #fef0f0 !important;
}

:deep(.row-overdue:hover > td) {
  background-color: #fde2e2 !important;
}
</style>
