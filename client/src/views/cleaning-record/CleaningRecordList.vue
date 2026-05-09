<template>
  <div class="cleaning-record-page">
    <PageHeaderBlock eyebrow="设备与现场" title="清洁消毒记录" description="记录和追踪清洁消毒作业执行情况" />

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">清洁记录列表<span class="card-count">共 {{ list.length }} 条记录</span></h3>
        <div class="app-panel-header__actions">
          <el-select
            v-model="filterTargetType"
            placeholder="全部类型"
            clearable
            style="width: 140px; margin-right: 12px"
            @change="loadList"
          >
            <el-option label="区域" value="area" />
            <el-option label="设备" value="equipment" />
            <el-option label="器具" value="utensil" />
            <el-option label="设施" value="facility" />
          </el-select>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建记录
          </el-button>
        </div>
      </div>
      <div class="app-panel--padded">

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="清洁对象类型" width="120">
          <template #default="{ row }">
            {{ getTargetTypeText(row.target_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="target_name" label="清洁对象名称" width="180" show-overflow-tooltip />
        <el-table-column prop="cleaning_method" label="清洁方法" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.cleaning_method ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="disinfectant" label="消毒剂" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.disinfectant ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="验证结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_pass ? 'success' : 'danger'" effect="light" size="small">
              {{ row.is_pass ? '通过' : '未通过' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.notes ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="清洁日期" width="160">
          <template #default="{ row }">{{ formatDate(row.cleaning_date) }}</template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 新建对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建清洁消毒记录" width="520px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <el-form-item label="对象类型" prop="target_type">
          <el-select v-model="createForm.target_type" placeholder="请选择" style="width: 100%">
            <el-option label="区域" value="area" />
            <el-option label="设备" value="equipment" />
            <el-option label="器具" value="utensil" />
            <el-option label="设施" value="facility" />
          </el-select>
        </el-form-item>
        <el-form-item label="对象名称" prop="target_name">
          <el-input v-model="createForm.target_name" placeholder="例如：灌装间、封口机" />
        </el-form-item>
        <el-form-item label="清洁方法">
          <el-input v-model="createForm.cleaning_method" placeholder="例如：湿式清洁、高压冲洗" />
        </el-form-item>
        <el-form-item label="消毒剂">
          <el-input v-model="createForm.disinfectant" placeholder="例如：75% 酒精、次氯酸钠" />
        </el-form-item>
        <el-form-item label="验证结果" prop="is_pass">
          <el-radio-group v-model="createForm.is_pass">
            <el-radio :value="true">通过</el-radio>
            <el-radio :value="false">未通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="2"
            placeholder="可填写备注信息（可选）"
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
import cleaningRecordApi, { type CleaningRecord, getTargetTypeText } from '@/api/cleaning-record';

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<CleaningRecord[]>([]);
const loading = ref(false);
const filterTargetType = ref('');

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  target_type: '',
  target_name: '',
  cleaning_method: '',
  disinfectant: '',
  is_pass: true,
  notes: '',
});

const createRules: FormRules = {
  target_type: [{ required: true, message: '请选择对象类型', trigger: 'change' }],
  target_name: [{ required: true, message: '请输入对象名称', trigger: 'blur' }],
  is_pass: [{ required: true, message: '请选择验证结果', trigger: 'change' }],
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
    const res = await cleaningRecordApi.getList(filterTargetType.value || undefined);
    list.value = res.data as unknown as CleaningRecord[];
  } catch {
    ElMessage.error('加载记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.target_type = '';
  createForm.target_name = '';
  createForm.cleaning_method = '';
  createForm.disinfectant = '';
  createForm.is_pass = true;
  createForm.notes = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await cleaningRecordApi.create({
      target_type: createForm.target_type,
      target_name: createForm.target_name,
      cleaning_method: createForm.cleaning_method || undefined,
      disinfectant: createForm.disinfectant || undefined,
      is_pass: createForm.is_pass,
      notes: createForm.notes || undefined,
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
.cleaning-record-page {
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
