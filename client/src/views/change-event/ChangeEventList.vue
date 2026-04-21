<template>
  <div class="change-event-page">
    <div class="page-header">
      <h1 class="page-title">变更管理</h1>
      <p class="page-subtitle">记录并追踪生产变更事件及验证情况</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">变更列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建变更
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="change_no" label="变更编号" width="180" />
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column label="变更类型" width="110">
          <template #default="{ row }">
            {{ getChangeTypeText(row.change_type) }}
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskType(row.risk_level)" effect="light" size="small">
              {{ getRiskText(row.risk_level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="initiated_by" label="发起人" width="120">
          <template #default="{ row }">
            {{ row.initiated_by ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'draft'"
              link
              type="primary"
              @click="handleApprove(row)"
            >
              审批
            </el-button>
            <el-button
              link
              type="success"
              @click="openVerificationDialog(row)"
            >
              添加验证
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建变更对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建变更"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入变更标题" />
        </el-form-item>
        <el-form-item label="变更类型" prop="change_type">
          <el-select v-model="createForm.change_type" placeholder="请选择" style="width: 100%">
            <el-option label="人员" value="personnel" />
            <el-option label="工艺" value="process" />
            <el-option label="设备" value="equipment" />
            <el-option label="配方" value="formula" />
            <el-option label="设施" value="facility" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请描述变更内容"
          />
        </el-form-item>
        <el-form-item label="风险等级" prop="risk_level">
          <el-select v-model="createForm.risk_level" placeholder="请选择" style="width: 100%">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>

    <!-- 添加验证对话框 -->
    <el-dialog
      v-model="verificationDialogVisible"
      title="添加验证记录"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="verificationFormRef"
        :model="verificationForm"
        :rules="verificationRules"
        label-width="100px"
      >
        <el-form-item label="验证日期" prop="verification_date">
          <el-date-picker
            v-model="verificationForm.verification_date"
            type="date"
            placeholder="请选择验证日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="验证结果" prop="result">
          <el-select v-model="verificationForm.result" placeholder="请选择" style="width: 100%">
            <el-option label="通过" value="pass" />
            <el-option label="失败" value="fail" />
            <el-option label="部分通过" value="partial" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="verificationForm.description"
            type="textarea"
            :rows="3"
            placeholder="可填写验证详情（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verificationDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingVerification" @click="handleCreateVerification">
          提交验证
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import changeEventApi, {
  type ChangeEvent,
  getStatusText,
  getStatusType,
  getRiskText,
  getRiskType,
} from '@/api/change-event';

// ── Change type label ─────────────────────────────────────────────────────────

const CHANGE_TYPE_MAP: Record<string, string> = {
  personnel: '人员',
  process: '工艺',
  equipment: '设备',
  formula: '配方',
  facility: '设施',
};

function getChangeTypeText(type: string): string {
  return CHANGE_TYPE_MAP[type] ?? type;
}

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<ChangeEvent[]>([]);
const loading = ref(false);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  title: '',
  change_type: '',
  description: '',
  risk_level: 'low',
});

const createRules: FormRules = {
  title: [{ required: true, message: '请填写变更标题', trigger: 'blur' }],
  change_type: [{ required: true, message: '请选择变更类型', trigger: 'change' }],
  description: [{ required: true, message: '请填写变更描述', trigger: 'blur' }],
};

// ── Verification dialog ───────────────────────────────────────────────────────

const verificationDialogVisible = ref(false);
const submittingVerification = ref(false);
const verificationFormRef = ref<FormInstance>();
const currentEventId = ref('');

const verificationForm = reactive({
  verification_date: '',
  result: '',
  description: '',
});

const verificationRules: FormRules = {
  verification_date: [{ required: true, message: '请选择验证日期', trigger: 'change' }],
  result: [{ required: true, message: '请选择验证结果', trigger: 'change' }],
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
    const res = await changeEventApi.getList();
    list.value = res.data as unknown as ChangeEvent[];
  } catch {
    ElMessage.error('加载变更列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.title = '';
  createForm.change_type = '';
  createForm.description = '';
  createForm.risk_level = 'low';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await changeEventApi.create({
      title: createForm.title,
      change_type: createForm.change_type,
      description: createForm.description,
      risk_level: createForm.risk_level || undefined,
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

// ── Approve ───────────────────────────────────────────────────────────────────

async function handleApprove(event: ChangeEvent) {
  try {
    await ElMessageBox.confirm(
      `确认审批变更 ${event.change_no}？`,
      '审批确认',
      { confirmButtonText: '确认审批', cancelButtonText: '取消', type: 'warning' },
    );
    await changeEventApi.approve(event.id);
    ElMessage.success('审批成功');
    await loadList();
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败，请重试');
    }
  }
}

// ── Verification ──────────────────────────────────────────────────────────────

function openVerificationDialog(event: ChangeEvent) {
  currentEventId.value = event.id;
  verificationForm.verification_date = '';
  verificationForm.result = '';
  verificationForm.description = '';
  verificationDialogVisible.value = true;
}

async function handleCreateVerification() {
  await verificationFormRef.value?.validate();
  submittingVerification.value = true;
  try {
    await changeEventApi.createVerification(currentEventId.value, {
      verification_date: verificationForm.verification_date,
      result: verificationForm.result,
      description: verificationForm.description || undefined,
    });
    ElMessage.success('验证记录已添加');
    verificationDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('添加验证失败，请重试');
  } finally {
    submittingVerification.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.change-event-page {
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
