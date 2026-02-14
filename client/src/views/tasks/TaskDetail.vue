<template>
  <div class="task-detail" v-loading="loading">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">任务详情</span>
        <el-tag
          v-if="isLocked"
          type="info"
          effect="dark"
          size="small"
          style="margin-left: 12px; vertical-align: middle;"
        >
          <el-icon style="margin-right: 4px;"><Lock /></el-icon>
          已锁定
        </el-tag>
      </template>
    </el-page-header>

    <el-card class="info-card" v-if="task">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务ID">{{ task.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(task.status)">{{ getStatusText(task.status) }}</el-tag>
          <el-tag v-if="isOverdue(task.deadline, task.status)" type="danger" size="small" style="margin-left: 8px">
            已逾期
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="模板">{{ task.template?.title }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ task.department?.name }}</el-descriptions-item>
        <el-descriptions-item label="截止日期">
          <span :class="{ 'overdue-text': isOverdue(task.deadline, task.status) }">
            {{ formatDate(task.deadline) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="创建人">{{ task.creator?.name }}</el-descriptions-item>
      </el-descriptions>

      <div class="task-actions" v-if="task.status === 'pending' && canCancel">
        <el-button type="danger" @click="handleCancel">取消任务</el-button>
      </div>
    </el-card>

    <el-card class="form-card" v-if="showFormCard">
      <template #header>
        <span v-if="isLocked">查看数据（只读）</span>
        <span v-else>填写任务</span>
      </template>

      <el-alert
        v-if="deviationResult.hasDeviation && !isLocked"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px;"
      >
        检测到 {{ deviationResult.deviations.length }} 个字段偏离标准范围，提交时需填写偏离原因
      </el-alert>

      <FormBuilder
        :fields="task?.template?.fieldsJson || []"
        v-model="formData"
        ref="formRef"
        :disabled="isLocked"
      />
      <div class="actions" v-if="!isLocked">
        <el-button @click="handleSaveDraft" :loading="savingDraft" v-if="canSaveDraft">
          保存草稿
        </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">提交</el-button>
      </div>
    </el-card>

    <!-- 偏离原因填写弹窗 -->
    <DeviationReasonDialog
      v-model:visible="deviationDialogVisible"
      :deviations="deviationResult.deviations"
      @confirm="handleDeviationConfirm"
      @cancel="handleDeviationCancel"
    />

    <el-card class="records-card" v-if="records.length">
      <template #header><span>提交记录</span></template>
      <el-table :data="records" stripe>
        <el-table-column prop="submitter" label="提交人" width="100">
          <template #default="{ row }">{{ row.submitter?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="180">
          <template #default="{ row }">{{ formatDate(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getRecordStatusType(row.status)">{{ getRecordStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="approver" label="审批人" width="100">
          <template #default="{ row }">{{ row.approver?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="approvedAt" label="审批时间" width="180">
          <template #default="{ row }">{{ row.approvedAt ? formatDate(row.approvedAt) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="comment" label="意见" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="150" v-if="canApprove">
          <template #default="{ row }">
            <template v-if="row.status === 'submitted'">
              <el-button type="success" link size="small" @click="handleApprove(row)">通过</el-button>
              <el-button type="danger" link size="small" @click="handleReject(row)">驳回</el-button>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Lock } from '@element-plus/icons-vue';
import taskApi, {
  isTaskLocked,
  isTaskOverdue,
  getTaskStatusText,
  getTaskStatusType,
  getRecordStatusText,
  getRecordStatusType,
  type Task,
  type TaskRecord,
} from '@/api/task';
import FormBuilder, { type TemplateField } from '@/components/FormBuilder.vue';
import DeviationReasonDialog from '@/components/deviation/DeviationReasonDialog.vue';
import deviationApi, { type ToleranceFieldConfig } from '@/api/deviation';
import { detectDeviations, debounce } from '@/utils/deviationDetector';
import { useUserStore } from '@/stores/user';

// Extended local task type for template with fieldsJson typed as TemplateField[]
interface TaskWithFields extends Omit<Task, 'template'> {
  template: { id: string; title: string; fieldsJson: TemplateField[] };
}

const route = useRoute();
const userStore = useUserStore();
const loading = ref(false);
const submitting = ref(false);
const savingDraft = ref(false);
const task = ref<TaskWithFields | null>(null);
const records = ref<TaskRecord[]>([]);
const formData = reactive<Record<string, unknown>>({});
const currentUserId = computed(() => userStore.user?.id ?? '');
const toleranceConfigs = ref<ToleranceFieldConfig[]>([]);
const deviationDialogVisible = ref(false);
const deviationReasons = ref<Record<string, string>>({});
const deviationResult = reactive({
  hasDeviation: false,
  deviations: [] as { fieldName: string; value: unknown; min?: number; max?: number }[],
});

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');

const isOverdue = (deadline: string, status: string): boolean => isTaskOverdue(deadline, status);
const getStatusType = (s: string) => getTaskStatusType(s);
const getStatusText = (s: string) => getTaskStatusText(s);

const isLocked = computed(() => isTaskLocked(task.value?.status || ''));

const showFormCard = computed(() => {
  const status = task.value?.status;
  return status === 'pending' || status === 'submitted'
    || status === 'approved' || status === 'rejected';
});

const canSaveDraft = computed(() => {
  const status = task.value?.status;
  return status === 'pending' || status === 'submitted';
});

const canCancel = computed(() => {
  return task.value?.creatorId === currentUserId.value;
});

const canApprove = computed(() => {
  return userStore.isAdmin || userStore.isLeader;
});

const fetchData = async () => {
  loading.value = true;
  try {
    const taskId = route.params.id as string;
    const res = await taskApi.getTaskById(taskId);
    const taskData = res as Task & { template: { id: string; title: string; fieldsJson: TemplateField[] } };
    task.value = taskData as TaskWithFields;
    records.value = taskData.records ?? [];

    // Load draft data into form if available
    if (res.draftData && typeof res.draftData === 'object') {
      const draft = res.draftData as Record<string, unknown>;
      Object.assign(formData, draft);
    }

    // Fetch tolerance config for the template
    if (task.value?.template?.id) {
      await fetchToleranceConfig(task.value.template.id);
    }
  } catch {
    ElMessage.error('获取任务详情失败');
  } finally {
    loading.value = false;
  }
};

const fetchToleranceConfig = async (templateId: string) => {
  try {
    const res = await deviationApi.getToleranceConfig(templateId);
    toleranceConfigs.value = res.fields || [];
  } catch (error: unknown) {
    // 404 means no tolerance config for this template - that is normal
    const httpError = error as { response?: { status?: number } };
    if (httpError?.response?.status !== 404) {
      // Other errors are silently ignored to not block the user
    }
  }
};

// Real-time deviation detection (debounced)
const checkDeviations = debounce(() => {
  if (toleranceConfigs.value.length === 0) {
    return;
  }

  const result = detectDeviations(formData, toleranceConfigs.value);
  deviationResult.hasDeviation = result.hasDeviation;
  deviationResult.deviations = result.deviations;
}, 500);

// Watch form data changes for real-time deviation detection
watch(formData, () => {
  checkDeviations();
}, { deep: true });

const handleSaveDraft = async () => {
  if (!task.value?.id) return;
  savingDraft.value = true;
  try {
    await taskApi.saveDraft(task.value.id, { data: { ...formData } });
    ElMessage.success('草稿已保存');
  } catch {
    ElMessage.error('保存草稿失败');
  } finally {
    savingDraft.value = false;
  }
};

const handleSubmit = async () => {
  // If deviations exist and no reason provided, show dialog
  if (deviationResult.hasDeviation && Object.keys(deviationReasons.value).length === 0) {
    deviationDialogVisible.value = true;
    return;
  }

  submitting.value = true;
  try {
    const taskId = task.value?.id;
    if (!taskId) return;

    const reasons = deviationResult.hasDeviation && Object.keys(deviationReasons.value).length > 0
      ? deviationReasons.value
      : undefined;

    await taskApi.submitTaskById(taskId, { ...formData }, reasons);
    ElMessage.success('提交成功');
    deviationReasons.value = {};
    fetchData();
  } catch {
    ElMessage.error('提交失败');
  } finally {
    submitting.value = false;
  }
};

const handleDeviationConfirm = (reason: string | Record<string, string>) => {
  if (typeof reason === 'string') {
    // Convert single reason string to Record keyed by deviation field names
    const reasonMap: Record<string, string> = {};
    for (const d of deviationResult.deviations) {
      reasonMap[d.fieldName] = reason;
    }
    deviationReasons.value = reasonMap;
  } else {
    deviationReasons.value = reason;
  }
  deviationDialogVisible.value = false;
  handleSubmit();
};

const handleDeviationCancel = () => {
  deviationDialogVisible.value = false;
  ElMessage.info('已取消提交');
};

const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消该任务吗？此操作不可恢复。', '警告', { type: 'warning' });
    if (!task.value?.id) return;
    await taskApi.cancelTask(task.value.id);
    ElMessage.success('任务已取消');
    fetchData();
  } catch {
    // User cancelled the dialog - do nothing
  }
};

const handleApprove = async (row: TaskRecord) => {
  try {
    await taskApi.approveTask({ recordId: row.id, status: 'approved' });
    ElMessage.success('审批通过');
    fetchData();
  } catch {
    ElMessage.error('审批操作失败');
  }
};

const handleReject = async (row: TaskRecord) => {
  try {
    const { value: comment } = await ElMessageBox.prompt('请输入驳回意见', '驳回任务', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '请输入驳回意见',
    });
    await taskApi.approveTask({ recordId: row.id, status: 'rejected', comment });
    ElMessage.success('已驳回');
    fetchData();
  } catch {
    // User cancelled the dialog - do nothing
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.task-detail { padding: 0; }
.page-title { font-size: 18px; font-weight: bold; }
.info-card, .form-card, .records-card { margin-top: 16px; }
.actions { margin-top: 16px; text-align: right; display: flex; justify-content: flex-end; gap: 8px; }
.task-actions { margin-top: 16px; text-align: right; }
.overdue-text { color: #f56c6c; font-weight: bold; }
</style>
