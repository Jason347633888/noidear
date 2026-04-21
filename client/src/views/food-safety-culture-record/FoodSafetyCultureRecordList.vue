<template>
  <div class="fsc-list-page">
    <div class="page-header">
      <h1 class="page-title">食品安全文化建设记录</h1>
      <p class="page-subtitle">记录培训、检查、会议及宣传活动等食品安全文化活动</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">活动记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建记录
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="活动类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getActivityTagType(row.activity_type)" effect="light" size="small">
              {{ getActivityTypeText(row.activity_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column label="参与人数" width="100" align="center">
          <template #default="{ row }">
            {{ row.participants != null ? row.participants + ' 人' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="执行日期" width="130">
          <template #default="{ row }">
            {{ formatDate(row.conducted_at) }}
          </template>
        </el-table-column>
        <el-table-column label="执行人" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.organizer_id || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="result_summary" label="结果摘要" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.result_summary || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-popconfirm
              title="确认删除该条记录？"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="handleRemove(row.id)"
            >
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
      title="新建食品安全文化活动记录"
      width="540px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="活动类型" prop="activity_type">
          <el-select v-model="createForm.activity_type" placeholder="请选择" style="width: 100%">
            <el-option label="培训" value="training" />
            <el-option label="检查" value="inspection" />
            <el-option label="会议" value="meeting" />
            <el-option label="宣传活动" value="campaign" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入活动标题" />
        </el-form-item>
        <el-form-item label="活动描述">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="2"
            placeholder="活动内容描述"
          />
        </el-form-item>
        <el-form-item label="参与人数">
          <el-input-number
            v-model="createForm.participants"
            :min="0"
            :precision="0"
            placeholder="人数"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="执行日期">
          <el-date-picker
            v-model="createForm.conducted_at"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="执行人">
          <el-input v-model="createForm.organizer_id" placeholder="姓名或工号" />
        </el-form-item>
        <el-form-item label="结果摘要">
          <el-input
            v-model="createForm.result_summary"
            type="textarea"
            :rows="2"
            placeholder="活动结果或结论"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="2"
            placeholder="其他说明"
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
import foodSafetyCultureRecordApi, {
  type FoodSafetyCultureRecord,
  type ActivityType,
  getActivityTypeText,
} from '@/api/food-safety-culture-record';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<FoodSafetyCultureRecord[]>([]);
const loading = ref(false);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  activity_type: '' as ActivityType | '',
  title: '',
  description: '',
  participants: undefined as number | undefined,
  conducted_at: '',
  organizer_id: '',
  result_summary: '',
  notes: '',
});

const createRules: FormRules = {
  activity_type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
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

const ACTIVITY_TAG_TYPES: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  training: 'primary',
  inspection: 'success',
  meeting: 'info',
  campaign: 'warning',
};

function getActivityTagType(activityType: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  return ACTIVITY_TAG_TYPES[activityType] ?? 'info';
}

function resetForm() {
  createForm.activity_type = '';
  createForm.title = '';
  createForm.description = '';
  createForm.participants = undefined;
  createForm.conducted_at = '';
  createForm.organizer_id = '';
  createForm.result_summary = '';
  createForm.notes = '';
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await foodSafetyCultureRecordApi.getList();
    list.value = res as unknown as FoodSafetyCultureRecord[];
  } catch {
    ElMessage.error('加载食品安全文化活动记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  resetForm();
  createDialogVisible.value = true;
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await foodSafetyCultureRecordApi.create({
      activity_type: createForm.activity_type as ActivityType,
      title: createForm.title,
      description: createForm.description || undefined,
      participants: createForm.participants,
      conducted_at: createForm.conducted_at || undefined,
      organizer_id: createForm.organizer_id || undefined,
      result_summary: createForm.result_summary || undefined,
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

// ── Remove ────────────────────────────────────────────────────────────────────

async function handleRemove(id: string) {
  try {
    await foodSafetyCultureRecordApi.remove(id);
    list.value = list.value.filter((item) => item.id !== id);
    ElMessage.success('删除成功');
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
.fsc-list-page {
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
