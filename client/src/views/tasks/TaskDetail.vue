<template>
  <div class="task-detail" v-loading="loading">
    <el-page-header @back="$router.back()">
      <template #content><span class="page-title">任务详情</span></template>
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

    <el-card class="form-card" v-if="task?.status === 'pending'">
      <template #header><span>填写任务</span></template>

      <el-alert
        v-if="deviationResult.hasDeviation"
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
      />
      <div class="actions">
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
import request from '@/api/request';
import FormBuilder, { type TemplateField } from '@/components/FormBuilder.vue';
import DeviationReasonDialog from '@/components/deviation/DeviationReasonDialog.vue';
import deviationApi, { type ToleranceFieldConfig } from '@/api/deviation';
import { detectDeviations, debounce } from '@/utils/deviationDetector';

interface Task {
  id: string;
  template: { id: string; title: string; fieldsJson: TemplateField[] };
  department: { id: string; name: string };
  deadline: string;
  status: string;
  creatorId: string;
  creator: { name: string } | null;
}

interface Record {
  id: string;
  submitter: { name: string } | null;
  approver: { name: string } | null;
  submittedAt: string;
  approvedAt: string;
  status: string;
  comment: string;
}

const route = useRoute();
const loading = ref(false);
const submitting = ref(false);
const task = ref<Task | null>(null);
const records = ref<Record[]>([]);
const formData = reactive<Record<string, unknown>>({});
const currentUserId = ref('');
const toleranceConfigs = ref<ToleranceFieldConfig[]>([]);
const deviationDialogVisible = ref(false);
const deviationReason = ref('');
const deviationResult = reactive({
  hasDeviation: false,
  deviations: [] as any[],
});

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');

const isOverdue = (deadline: string, status: string): boolean => {
  if (status === 'completed' || status === 'cancelled') return false;
  return new Date(deadline) < new Date();
};

const getStatusType = (s: string) => ({ pending: 'warning', completed: 'success', cancelled: 'info' }[s] || 'info');
const getStatusText = (s: string) => ({ pending: '进行中', completed: '已完成', cancelled: '已取消' }[s] || s);
const getRecordStatusType = (s: string) => ({ submitted: 'info', approved: 'success', rejected: 'danger' }[s] || 'info');
const getRecordStatusText = (s: string) => ({ submitted: '待审批', approved: '通过', rejected: '驳回' }[s] || s);

const canCancel = computed(() => {
  return task.value?.creatorId === currentUserId.value;
});

const canApprove = computed(() => {
  // 任务发起人可以审批
  return task.value?.creatorId === currentUserId.value;
});

const fetchCurrentUser = async () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      currentUserId.value = user.id || '';
    }
  } catch {}
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<any>(`/tasks/${route.params.id}`);
    task.value = res;
    records.value = res.records || [];

    // 获取模板的公差配置
    if (task.value?.template?.id) {
      await fetchToleranceConfig(task.value.template.id);
    }
  } catch { ElMessage.error('获取任务详情失败'); }
  finally { loading.value = false; }
};

const fetchToleranceConfig = async (templateId: string) => {
  try {
    const res = await deviationApi.getToleranceConfig(templateId);
    toleranceConfigs.value = res.fields || [];
  } catch (error: any) {
    // 404 表示模板没有配置公差，这是正常情况
    if (error?.response?.status !== 404) {
      // 其他错误才提示
    }
  }
};

// 实时偏离检测（防抖）
const checkDeviations = debounce(() => {
  if (toleranceConfigs.value.length === 0) {
    return;
  }

  const result = detectDeviations(formData, toleranceConfigs.value);
  deviationResult.hasDeviation = result.hasDeviation;
  deviationResult.deviations = result.deviations;
}, 500);

// 监听表单数据变化，实时检测偏离
watch(formData, () => {
  checkDeviations();
}, { deep: true });

const handleSubmit = async () => {
  // 如果有偏离且没有填写原因，弹出对话框
  if (deviationResult.hasDeviation && !deviationReason.value) {
    deviationDialogVisible.value = true;
    return;
  }

  submitting.value = true;
  try {
    const submitData: any = {
      taskId: task.value?.id,
      data: formData,
    };

    // 如果有偏离，附带偏离原因
    if (deviationResult.hasDeviation && deviationReason.value) {
      submitData.deviationReasons = deviationReason.value;
    }

    await request.post('/tasks/submit', submitData);
    ElMessage.success('提交成功');
    deviationReason.value = ''; // 清空偏离原因
    fetchData();
  } catch {} finally { submitting.value = false; }
};

const handleDeviationConfirm = (reason: string) => {
  deviationReason.value = reason;
  deviationDialogVisible.value = false;
  // 填写完原因后自动提交
  handleSubmit();
};

const handleDeviationCancel = () => {
  deviationDialogVisible.value = false;
  ElMessage.info('已取消提交');
};

const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消该任务吗？此操作不可恢复。', '警告', { type: 'warning' });
    await request.post(`/tasks/${task.value?.id}/cancel`);
    ElMessage.success('任务已取消');
    fetchData();
  } catch {}
};

const handleApprove = async (row: Record) => {
  try {
    await request.post('/tasks/approve', { recordId: row.id, status: 'approved' });
    ElMessage.success('审批通过');
    fetchData();
  } catch {}
};

const handleReject = async (row: Record) => {
  try {
    const { value: comment } = await ElMessageBox.prompt('请输入驳回意见', '驳回任务', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '请输入驳回意见',
    });
    await request.post('/tasks/approve', { recordId: row.id, status: 'rejected', comment });
    ElMessage.success('已驳回');
    fetchData();
  } catch {}
};

onMounted(() => {
  fetchCurrentUser();
  fetchData();
});
</script>

<style scoped>
.task-detail { padding: 0; }
.page-title { font-size: 18px; font-weight: bold; }
.info-card, .form-card, .records-card { margin-top: 16px; }
.actions { margin-top: 16px; text-align: right; }
.task-actions { margin-top: 16px; text-align: right; }
.overdue-text { color: #f56c6c; font-weight: bold; }
</style>
