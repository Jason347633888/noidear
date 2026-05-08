<template>
  <div class="medication-list-page">
    <PageHeaderBlock eyebrow="设备与现场" title="员工用药记录" description="登记员工用药情况并评估适岗性" />

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">用药记录列表<span class="card-count">共 {{ list.length }} 条记录</span></h3>
        <div class="app-panel-header__actions">
          <el-input
            v-model="filterEmployeeId"
            placeholder="按员工 ID 筛选"
            clearable
            style="width: 180px; margin-right: 12px"
            @change="loadList"
            @clear="loadList"
          />
          <el-select
            v-model="filterFitForDuty"
            placeholder="适岗性筛选"
            clearable
            style="width: 140px; margin-right: 12px"
            @change="loadList"
          >
            <el-option label="适合上班" :value="true" />
            <el-option label="不适合上班" :value="false" />
          </el-select>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建用药记录
          </el-button>
        </div>
      </div>
      <div class="app-panel--padded">

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="employee_id" label="员工 ID" width="150" />
        <el-table-column prop="drug_name" label="药物名称" width="150" show-overflow-tooltip />
        <el-table-column prop="dosage" label="用量" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.dosage ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="用药原因" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.reason ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="适合上班" width="100">
          <template #default="{ row }">
            <el-tag :type="row.fit_for_duty ? 'success' : 'danger'" effect="light" size="small">
              {{ row.fit_for_duty ? '适合' : '不适合' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="health_impact" label="健康影响" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.health_impact ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="assessed_by" label="评估人" width="120">
          <template #default="{ row }">{{ row.assessed_by ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="记录日期" width="160">
          <template #default="{ row }">
            {{ formatDate(row.record_date) }}
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建用药记录"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="员工 ID" prop="employee_id">
          <el-input v-model="createForm.employee_id" placeholder="请输入员工 ID" />
        </el-form-item>
        <el-form-item label="药物名称" prop="drug_name">
          <el-input v-model="createForm.drug_name" placeholder="请输入药物名称" />
        </el-form-item>
        <el-form-item label="用量">
          <el-input v-model="createForm.dosage" placeholder="例如：每日两次，每次一片（可选）" />
        </el-form-item>
        <el-form-item label="用药原因">
          <el-input v-model="createForm.reason" placeholder="请描述用药原因（可选）" />
        </el-form-item>
        <el-form-item label="健康影响">
          <el-input
            v-model="createForm.health_impact"
            type="textarea"
            :rows="2"
            placeholder="请描述对工作能力的影响（可选）"
          />
        </el-form-item>
        <el-form-item label="评估人">
          <el-input v-model="createForm.assessed_by" placeholder="评估人姓名（可选）" />
        </el-form-item>
        <el-form-item label="适合上班" prop="fit_for_duty">
          <el-radio-group v-model="createForm.fit_for_duty">
            <el-radio :value="true">适合上班</el-radio>
            <el-radio :value="false">不适合上班</el-radio>
          </el-radio-group>
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
import medicationRecordApi, { type MedicationRecord } from '@/api/medication-record';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const list = ref<MedicationRecord[]>([]);
const loading = ref(false);
const filterEmployeeId = ref('');
const filterFitForDuty = ref<boolean | ''>('');

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  employee_id: '',
  drug_name: '',
  dosage: '',
  reason: '',
  health_impact: '',
  assessed_by: '',
  fit_for_duty: true,
});

const createRules: FormRules = {
  employee_id: [{ required: true, message: '请输入员工 ID', trigger: 'blur' }],
  drug_name: [{ required: true, message: '请输入药物名称', trigger: 'blur' }],
  fit_for_duty: [{ required: true, message: '请选择适岗性', trigger: 'change' }],
};

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

async function loadList() {
  loading.value = true;
  try {
    const fitForDuty = filterFitForDuty.value === '' ? undefined : filterFitForDuty.value;
    const res = await medicationRecordApi.getList(filterEmployeeId.value || undefined, fitForDuty);
    list.value = res.data as unknown as MedicationRecord[];
  } catch {
    ElMessage.error('加载用药记录列表失败');
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  createForm.employee_id = '';
  createForm.drug_name = '';
  createForm.dosage = '';
  createForm.reason = '';
  createForm.health_impact = '';
  createForm.assessed_by = '';
  createForm.fit_for_duty = true;
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await medicationRecordApi.create({
      employee_id: createForm.employee_id,
      drug_name: createForm.drug_name,
      fit_for_duty: createForm.fit_for_duty,
      dosage: createForm.dosage || undefined,
      reason: createForm.reason || undefined,
      health_impact: createForm.health_impact || undefined,
      assessed_by: createForm.assessed_by || undefined,
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

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.medication-list-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
