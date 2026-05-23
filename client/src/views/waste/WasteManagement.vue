<template>
  <div class="waste-management-page">
    <div class="page-header">
      <h1 class="page-title">废弃物管理</h1>
      <p class="page-subtitle">管理废弃物销毁记录与废料统计记录</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- Tab 1: 废弃物销毁记录 -->
      <el-tab-pane label="废弃物销毁记录" name="disposals">
        <el-card shadow="never" class="inner-card">
          <template #header>
            <div class="card-header">
              <div class="card-title-wrap">
                <span class="card-title">销毁记录列表</span>
                <span class="card-count">共 {{ disposalList.length }} 条记录</span>
              </div>
              <el-button type="primary" @click="openDisposalDialog">
                <el-icon><Plus /></el-icon>新建销毁记录
              </el-button>
            </div>
          </template>

          <el-table :data="disposalList" v-loading="disposalLoading" stripe>
            <el-table-column prop="material_name" label="物料名称" min-width="150" show-overflow-tooltip />
            <el-table-column prop="lot_no" label="批次号" width="130">
              <template #default="{ row }">
                {{ row.lot_no ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column label="销毁原因" width="120">
              <template #default="{ row }">
                {{ getDisposalReasonText(row.disposal_reason) }}
              </template>
            </el-table-column>
            <el-table-column label="数量" width="120">
              <template #default="{ row }">
                {{ row.qty }} {{ row.unit }}
              </template>
            </el-table-column>
            <el-table-column prop="disposal_method" label="处置方法" min-width="130" show-overflow-tooltip />
            <el-table-column label="销毁日期" width="140">
              <template #default="{ row }">
                {{ formatDate(row.disposal_date) }}
              </template>
            </el-table-column>
            <el-table-column prop="operator_id" label="操作人" width="120">
              <template #default="{ row }">
                {{ row.operator_id ?? '-' }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: 废料统计记录 -->
      <el-tab-pane label="废料统计记录" name="records">
        <el-card shadow="never" class="inner-card">
          <template #header>
            <div class="card-header">
              <div class="card-title-wrap">
                <span class="card-title">废料记录列表</span>
                <span class="card-count">共 {{ wasteRecordList.length }} 条记录</span>
              </div>
              <div class="header-actions">
                <el-select
                  v-model="filterWasteType"
                  placeholder="按废弃物类型筛选"
                  clearable
                  style="width: 180px; margin-right: 12px"
                  @change="loadWasteRecords"
                  @clear="loadWasteRecords"
                >
                  <el-option label="化学废弃物" value="chemical" />
                  <el-option label="生物废弃物" value="biological" />
                  <el-option label="物理废弃物" value="physical" />
                  <el-option label="包装废弃物" value="packaging" />
                  <el-option label="其他" value="other" />
                </el-select>
                <el-button type="primary" @click="openWasteRecordDialog">
                  <el-icon><Plus /></el-icon>新建废料记录
                </el-button>
              </div>
            </div>
          </template>

          <el-table :data="wasteRecordList" v-loading="wasteRecordLoading" stripe>
            <el-table-column label="记录时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.recorded_at) }}
              </template>
            </el-table-column>
            <el-table-column label="废弃物类型" width="130">
              <template #default="{ row }">
                {{ getWasteTypeText(row.waste_type) }}
              </template>
            </el-table-column>
            <el-table-column label="数量" width="120">
              <template #default="{ row }">
                {{ row.qty }} {{ row.unit }}
              </template>
            </el-table-column>
            <el-table-column prop="production_batch_id" label="生产批次" width="140">
              <template #default="{ row }">
                {{ row.production_batch_id ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="shift" label="班次" width="100">
              <template #default="{ row }">
                {{ row.shift ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="disposal_destination" label="处置去向" min-width="130" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.disposal_destination ?? '-' }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 新建销毁记录对话框 -->
    <el-dialog
      v-model="disposalDialogVisible"
      title="新建废弃物销毁记录"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form ref="disposalFormRef" :model="disposalForm" :rules="disposalRules" label-width="110px">
        <el-form-item label="物料名称" prop="material_name">
          <el-input v-model="disposalForm.material_name" placeholder="请输入物料名称" />
        </el-form-item>
        <el-form-item label="批次号">
          <el-input v-model="disposalForm.lot_no" placeholder="批次号（可选）" />
        </el-form-item>
        <el-form-item label="销毁原因" prop="disposal_reason">
          <el-select v-model="disposalForm.disposal_reason" placeholder="请选择销毁原因" style="width: 100%">
            <el-option label="过期" value="expired" />
            <el-option label="不合格" value="non_conforming" />
            <el-option label="损坏" value="damaged" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="qty">
          <el-input-number v-model="disposalForm.qty" :min="0" :precision="4" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="disposalForm.unit" placeholder="例如：kg、L、件" />
        </el-form-item>
        <el-form-item label="处置方法" prop="disposal_method">
          <el-input v-model="disposalForm.disposal_method" placeholder="例如：焚烧、填埋、回收" />
        </el-form-item>
        <el-form-item label="销毁日期" prop="disposal_date">
          <el-date-picker
            v-model="disposalForm.disposal_date"
            type="date"
            placeholder="请选择销毁日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="disposalForm.operator_id" placeholder="操作人（可选）" />
        </el-form-item>
        <el-form-item label="见证人">
          <el-input v-model="disposalForm.witness_id" placeholder="见证人（可选）" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="disposalForm.notes" type="textarea" :rows="2" placeholder="备注信息（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disposalDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="disposalSubmitting" @click="handleCreateDisposal">确认新建</el-button>
      </template>
    </el-dialog>

    <!-- 新建废料记录对话框 -->
    <el-dialog
      v-model="wasteRecordDialogVisible"
      title="新建废料统计记录"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="wasteRecordFormRef" :model="wasteRecordForm" :rules="wasteRecordRules" label-width="110px">
        <el-form-item label="废弃物类型" prop="waste_type">
          <el-select v-model="wasteRecordForm.waste_type" placeholder="请选择废弃物类型" style="width: 100%">
            <el-option label="化学废弃物" value="chemical" />
            <el-option label="生物废弃物" value="biological" />
            <el-option label="物理废弃物" value="physical" />
            <el-option label="包装废弃物" value="packaging" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="qty">
          <el-input-number v-model="wasteRecordForm.qty" :min="0" :precision="4" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="wasteRecordForm.unit" placeholder="例如：kg、L、件" />
        </el-form-item>
        <el-form-item label="记录时间" prop="recorded_at">
          <el-date-picker
            v-model="wasteRecordForm.recorded_at"
            type="datetime"
            placeholder="请选择记录时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="生产批次">
          <ProductionBatchSelect v-model="wasteRecordForm.production_batch_id" />
        </el-form-item>
        <el-form-item label="班次">
          <el-input v-model="wasteRecordForm.shift" placeholder="例如：白班、夜班（可选）" />
        </el-form-item>
        <el-form-item label="处置去向">
          <el-input v-model="wasteRecordForm.disposal_destination" placeholder="废料处置去向（可选）" />
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="wasteRecordForm.operator_id" placeholder="操作人（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="wasteRecordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="wasteRecordSubmitting" @click="handleCreateWasteRecord">确认新建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import wasteApi, {
  type WasteDisposalRecord,
  type WasteRecord,
  getWasteTypeText,
  getDisposalReasonText,
} from '@/api/waste';
import { toList } from '@/utils/apiResponse';
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';

const activeTab = ref('disposals');

// --- Disposal Records ---
const disposalList = ref<WasteDisposalRecord[]>([]);
const disposalLoading = ref(false);
const disposalDialogVisible = ref(false);
const disposalSubmitting = ref(false);
const disposalFormRef = ref<FormInstance>();

const disposalForm = reactive({
  material_name: '',
  lot_no: '',
  disposal_reason: '',
  qty: 0,
  unit: '',
  disposal_method: '',
  disposal_date: '',
  operator_id: '',
  witness_id: '',
  notes: '',
});

const disposalRules: FormRules = {
  material_name: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  disposal_reason: [{ required: true, message: '请选择销毁原因', trigger: 'change' }],
  qty: [{ required: true, message: '请填写数量', trigger: 'blur' }],
  unit: [{ required: true, message: '请填写单位', trigger: 'blur' }],
  disposal_method: [{ required: true, message: '请填写处置方法', trigger: 'blur' }],
  disposal_date: [{ required: true, message: '请选择销毁日期', trigger: 'change' }],
};

async function loadDisposals() {
  disposalLoading.value = true;
  try {
    const res = await wasteApi.getDisposals();
    disposalList.value = toList<WasteDisposalRecord>(res);
  } catch {
    ElMessage.error('加载销毁记录列表失败');
  } finally {
    disposalLoading.value = false;
  }
}

function openDisposalDialog() {
  disposalForm.material_name = '';
  disposalForm.lot_no = '';
  disposalForm.disposal_reason = '';
  disposalForm.qty = 0;
  disposalForm.unit = '';
  disposalForm.disposal_method = '';
  disposalForm.disposal_date = '';
  disposalForm.operator_id = '';
  disposalForm.witness_id = '';
  disposalForm.notes = '';
  disposalDialogVisible.value = true;
}

async function handleCreateDisposal() {
  await disposalFormRef.value?.validate();
  disposalSubmitting.value = true;
  try {
    await wasteApi.createDisposal({
      material_name: disposalForm.material_name,
      lot_no: disposalForm.lot_no || undefined,
      disposal_reason: disposalForm.disposal_reason,
      qty: disposalForm.qty,
      unit: disposalForm.unit,
      disposal_method: disposalForm.disposal_method,
      disposal_date: disposalForm.disposal_date,
      operator_id: disposalForm.operator_id || undefined,
      witness_id: disposalForm.witness_id || undefined,
      notes: disposalForm.notes || undefined,
    });
    ElMessage.success('新建成功');
    disposalDialogVisible.value = false;
    await loadDisposals();
  } catch {
    ElMessage.error('新建失败，请重试');
  } finally {
    disposalSubmitting.value = false;
  }
}

// --- Waste Records ---
const wasteRecordList = ref<WasteRecord[]>([]);
const wasteRecordLoading = ref(false);
const wasteRecordDialogVisible = ref(false);
const wasteRecordSubmitting = ref(false);
const wasteRecordFormRef = ref<FormInstance>();
const filterWasteType = ref('');

const wasteRecordForm = reactive({
  waste_type: '',
  qty: 0,
  unit: '',
  recorded_at: '',
  production_batch_id: '',
  shift: '',
  disposal_destination: '',
  operator_id: '',
});

const wasteRecordRules: FormRules = {
  waste_type: [{ required: true, message: '请选择废弃物类型', trigger: 'change' }],
  qty: [{ required: true, message: '请填写数量', trigger: 'blur' }],
  unit: [{ required: true, message: '请填写单位', trigger: 'blur' }],
  recorded_at: [{ required: true, message: '请选择记录时间', trigger: 'change' }],
};

async function loadWasteRecords() {
  wasteRecordLoading.value = true;
  try {
    const res = await wasteApi.getWasteRecords(filterWasteType.value || undefined);
    wasteRecordList.value = toList<WasteRecord>(res);
  } catch {
    ElMessage.error('加载废料记录列表失败');
  } finally {
    wasteRecordLoading.value = false;
  }
}

function openWasteRecordDialog() {
  wasteRecordForm.waste_type = '';
  wasteRecordForm.qty = 0;
  wasteRecordForm.unit = '';
  wasteRecordForm.recorded_at = '';
  wasteRecordForm.production_batch_id = '';
  wasteRecordForm.shift = '';
  wasteRecordForm.disposal_destination = '';
  wasteRecordForm.operator_id = '';
  wasteRecordDialogVisible.value = true;
}

async function handleCreateWasteRecord() {
  await wasteRecordFormRef.value?.validate();
  wasteRecordSubmitting.value = true;
  try {
    await wasteApi.createWasteRecord({
      waste_type: wasteRecordForm.waste_type,
      qty: wasteRecordForm.qty,
      unit: wasteRecordForm.unit,
      recorded_at: wasteRecordForm.recorded_at,
      production_batch_id: wasteRecordForm.production_batch_id || undefined,
      shift: wasteRecordForm.shift || undefined,
      disposal_destination: wasteRecordForm.disposal_destination || undefined,
      operator_id: wasteRecordForm.operator_id || undefined,
    });
    ElMessage.success('新建成功');
    wasteRecordDialogVisible.value = false;
    await loadWasteRecords();
  } catch {
    ElMessage.error('新建失败，请重试');
  } finally {
    wasteRecordSubmitting.value = false;
  }
}

// --- Utilities ---
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

onMounted(() => {
  loadDisposals();
  loadWasteRecords();
});
</script>

<style scoped>
.waste-management-page {
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

.inner-card {
  border: none;
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
