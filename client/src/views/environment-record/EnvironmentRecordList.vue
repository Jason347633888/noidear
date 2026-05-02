<template>
  <div class="er-list-page">
    <div class="page-header">
      <h1 class="page-title">环境温湿度记录</h1>
      <p class="page-subtitle">监控生产环境温度、湿度及压差数据</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">环境记录列表</span>
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
        <el-table-column prop="location" label="监测位置" min-width="140" show-overflow-tooltip />
        <el-table-column label="记录类型" width="120">
          <template #default="{ row }">
            {{ getRecordTypeText(row.record_type) }}
          </template>
        </el-table-column>
        <el-table-column label="温度 (°C)" width="110">
          <template #default="{ row }">
            {{ row.temperature != null ? row.temperature : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="湿度 (%)" width="100">
          <template #default="{ row }">
            {{ row.humidity != null ? row.humidity : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="是否达标" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_within_spec ? 'success' : 'danger'" effect="light" size="small">
              {{ row.is_within_spec ? '达标' : '超标' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="abnormal_action" label="异常处理" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.abnormal_action || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="测量时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.measured_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建环境记录"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="监测位置" prop="location_id">
          <el-select v-model="createForm.location_id" placeholder="请选择监测位置" filterable style="width: 100%">
            <el-option
              v-for="area in areas"
              :key="area.id"
              :label="area.name"
              :value="area.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="记录类型" prop="record_type">
          <el-select v-model="createForm.record_type" placeholder="请选择" style="width: 100%">
            <el-option label="温湿度" value="temperature_humidity" />
            <el-option label="压差" value="pressure_differential" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="温度 (°C)">
          <el-input-number
            v-model="createForm.temperature"
            :precision="2"
            placeholder="温度值"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="湿度 (%)">
          <el-input-number
            v-model="createForm.humidity"
            :precision="2"
            :min="0"
            :max="100"
            placeholder="湿度值"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="压差 (Pa)">
          <el-input-number
            v-model="createForm.pressure_diff"
            :precision="2"
            placeholder="压差值"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="是否达标" prop="is_within_spec">
          <el-radio-group v-model="createForm.is_within_spec">
            <el-radio :value="true">达标</el-radio>
            <el-radio :value="false">超标</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="异常处理措施">
          <el-input
            v-model="createForm.abnormal_action"
            type="textarea"
            :rows="2"
            placeholder="超标时请填写处理措施"
          />
        </el-form-item>
        <el-form-item label="生产批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="createForm.production_batch_id" />
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
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';
import type { FormInstance, FormRules } from 'element-plus';
import environmentRecordApi, {
  type EnvironmentRecord,
  type RecordType,
  getRecordTypeText,
} from '@/api/environment-record';
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<EnvironmentRecord[]>([]);
const loading = ref(false);
const dateRange = ref<[string, string] | null>(null);
const areas = ref<WorkshopArea[]>([]);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  location_id: '',
  record_type: '' as RecordType | '',
  temperature: undefined as number | undefined,
  humidity: undefined as number | undefined,
  pressure_diff: undefined as number | undefined,
  is_within_spec: true,
  abnormal_action: '',
  production_batch_id: '',
});

const createRules: FormRules = {
  location_id: [{ required: true, message: '请选择监测位置', trigger: 'change' }],
  record_type: [{ required: true, message: '请选择记录类型', trigger: 'change' }],
  is_within_spec: [{ required: true, message: '请选择是否达标', trigger: 'change' }],
  production_batch_id: [{ required: true, message: '请选择生产批次', trigger: 'change' }],
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

async function loadAreas() {
  try {
    const res = await workshopAreaApi.getList();
    areas.value = (res as unknown as WorkshopArea[]) ?? [];
  } catch {
    ElMessage.error('加载监测位置列表失败');
  }
}

async function loadList() {
  loading.value = true;
  try {
    const [startDate, endDate] = dateRange.value ?? [undefined, undefined];
    const res = await environmentRecordApi.getList(startDate, endDate);
    list.value = res.data as unknown as EnvironmentRecord[];
  } catch {
    ElMessage.error('加载环境记录列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.location_id = '';
  createForm.record_type = '';
  createForm.temperature = undefined;
  createForm.humidity = undefined;
  createForm.pressure_diff = undefined;
  createForm.is_within_spec = true;
  createForm.abnormal_action = '';
  createForm.production_batch_id = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await environmentRecordApi.create({
      location_id: createForm.location_id,
      record_type: createForm.record_type as RecordType,
      temperature: createForm.temperature,
      humidity: createForm.humidity,
      pressure_diff: createForm.pressure_diff,
      is_within_spec: createForm.is_within_spec,
      abnormal_action: createForm.abnormal_action || undefined,
      production_batch_id: createForm.production_batch_id,
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
  loadAreas();
});
</script>

<style scoped>
.er-list-page {
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
