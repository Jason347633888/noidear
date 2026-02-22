<template>
  <div class="audit-execute">
    <el-card v-loading="loading">
      <template #header>
        <div class="header">
          <div class="header-left">
            <el-button link @click="router.back()">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
            <h2>审核执行</h2>
          </div>
          <div class="header-right">
            <el-button
              type="primary"
              :disabled="!canSubmit"
              :loading="submitting"
              @click="handleSubmitReport"
            >
              提交审核报告
            </el-button>
            <el-button
              v-if="plan && plan.status === 'pending_rectification'"
              type="warning"
              :loading="submitting"
              @click="handleWithdrawReport"
            >
              撤回审核报告
            </el-button>
          </div>
        </div>
      </template>

      <!-- 计划详情 -->
      <el-descriptions v-if="plan" :column="3" border class="plan-info">
        <el-descriptions-item label="标题">{{ plan.title }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag v-if="plan.type === 'quarterly'" type="success">季度内审</el-tag>
          <el-tag v-else-if="plan.type === 'semiannual'" type="warning">半年内审</el-tag>
          <el-tag v-else type="danger">年度内审</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="plan.status === 'draft'" type="info">草稿</el-tag>
          <el-tag v-else-if="plan.status === 'ongoing'" type="primary">进行中</el-tag>
          <el-tag v-else-if="plan.status === 'pending_rectification'" type="warning">待整改</el-tag>
          <el-tag v-else type="success">已完成</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核时间">
          {{ formatDate(plan.startDate) }} ~ {{ formatDate(plan.endDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="内审员">
          {{ plan.auditor?.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="审核进度">
          <el-progress
            :percentage="progressPercentage"
            :status="progressPercentage === 100 ? 'success' : undefined"
          />
          <span class="progress-text">已审核 {{ auditedCount }} / 共 {{ totalCount }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 文档列表 -->
      <el-divider>审核文档列表</el-divider>
      <el-table :data="documents" border>
        <el-table-column prop="title" label="文档标题" min-width="200" />
        <el-table-column label="审核结果" width="150">
          <template #default="{ row }">
            <el-tag v-if="findingMap[row.id]?.result === 'compliant'" type="success">符合</el-tag>
            <el-tag v-else-if="findingMap[row.id]?.result === 'non_compliant'" type="danger">不符合</el-tag>
            <el-tag v-else type="info">待审核</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="问题描述" min-width="200">
          <template #default="{ row }">
            <span v-if="findingMap[row.id]?.result === 'non_compliant'">
              {{ findingMap[row.id]?.description || '-' }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="整改期限" width="130">
          <template #default="{ row }">
            {{ findingMap[row.id]?.rectificationDeadline
              ? formatDate(findingMap[row.id].rectificationDeadline!)
              : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleRecord(row)">
              {{ findingMap[row.id] ? '修改结果' : '记录结果' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 记录审核结果对话框 -->
    <el-dialog v-model="recordDialogVisible" title="记录审核结果" width="600px">
      <el-form :model="recordForm" :rules="recordRules" ref="recordFormRef" label-width="120px">
        <el-form-item label="审核结果" prop="result">
          <el-radio-group v-model="recordForm.result" @change="handleResultChange">
            <el-radio value="compliant">符合</el-radio>
            <el-radio value="non_compliant">不符合</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="recordForm.result === 'non_compliant'">
          <el-form-item label="问题类型" prop="issueType">
            <el-select v-model="recordForm.issueType" placeholder="请选择问题类型">
              <el-option label="需要修改" value="needs_modification" />
              <el-option label="缺失记录" value="missing_record" />
              <el-option label="文档缺失" value="missing_document" />
            </el-select>
          </el-form-item>

          <el-form-item label="问题描述" prop="description">
            <el-input
              v-model="recordForm.description"
              type="textarea"
              :rows="3"
              placeholder="请详细描述问题（至少10个字符）"
            />
          </el-form-item>

          <el-form-item label="责任部门" prop="responsibleDepartment">
            <el-input v-model="recordForm.responsibleDepartment" placeholder="请输入责任部门" />
          </el-form-item>

          <el-form-item label="责任人" prop="responsiblePersonId">
            <el-select
              v-model="recordForm.responsiblePersonId"
              placeholder="请选择责任人"
              filterable
            >
              <el-option
                v-for="user in users"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="整改期限">
            <el-input :value="defaultDeadline" disabled />
            <div class="hint-text">整改期限自动设置为今天起30天后</div>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="recordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveRecord" :loading="recordSubmitting">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { getAuditPlan, type AuditPlan } from '@/api/internal-audit/plan';
import {
  createFinding,
  updateFinding,
  submitAuditReport,
  withdrawAuditReport,
  type AuditFinding,
  type FindingIssueType,
} from '@/api/internal-audit/finding';

const route = useRoute();
const router = useRouter();
const planId = route.params.id as string;

const loading = ref(false);
const submitting = ref(false);
const recordSubmitting = ref(false);
const plan = ref<AuditPlan | null>(null);
const documents = ref<Array<{ id: string; title: string }>>([]);
const findingMap = ref<Record<string, AuditFinding>>({});
const users = ref<Array<{ id: string; name: string }>>([]);

const recordDialogVisible = ref(false);
const recordFormRef = ref();
const currentDocId = ref('');
const currentFindingId = ref('');

const recordForm = reactive({
  result: 'compliant' as 'compliant' | 'non_compliant',
  issueType: '' as FindingIssueType | '',
  description: '',
  responsibleDepartment: '',
  responsiblePersonId: '',
});

const defaultDeadline = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
});

const auditedCount = computed(() => Object.keys(findingMap.value).length);
const totalCount = computed(() => documents.value.length);
const progressPercentage = computed(() =>
  totalCount.value === 0 ? 0 : Math.round((auditedCount.value / totalCount.value) * 100)
);
const canSubmit = computed(
  () =>
    plan.value?.status === 'ongoing' &&
    auditedCount.value === totalCount.value &&
    totalCount.value > 0
);

const recordRules = computed(() => {
  const base: Record<string, any[]> = {
    result: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
  };
  if (recordForm.result === 'non_compliant') {
    return {
      ...base,
      issueType: [{ required: true, message: '请选择问题类型', trigger: 'change' }],
      description: [
        { required: true, message: '请填写问题描述', trigger: 'blur' },
        { min: 10, message: '问题描述至少10个字符', trigger: 'blur' },
      ],
      responsibleDepartment: [{ required: true, message: '请填写责任部门', trigger: 'blur' }],
      responsiblePersonId: [{ required: true, message: '请选择责任人', trigger: 'change' }],
    };
  }
  return base;
});

const fetchPlan = async () => {
  loading.value = true;
  try {
    const res = await getAuditPlan(planId);
    plan.value = res;
    documents.value = (res.documentIds || []).map((id: string) => ({
      id,
      title: `文档 ${id}`,
    }));
  } catch (error: any) {
    ElMessage.error(error.message || '获取计划详情失败');
  } finally {
    loading.value = false;
  }
};

const handleResultChange = () => {
  recordForm.issueType = '';
  recordForm.description = '';
  recordForm.responsibleDepartment = '';
  recordForm.responsiblePersonId = '';
};

const handleRecord = (row: { id: string; title: string }) => {
  currentDocId.value = row.id;
  const existing = findingMap.value[row.id];
  if (existing) {
    currentFindingId.value = existing.id;
    Object.assign(recordForm, {
      result: existing.result,
      issueType: existing.issueType || '',
      description: existing.description || '',
      responsibleDepartment: existing.responsibleDepartment || '',
      responsiblePersonId: existing.responsiblePersonId || '',
    });
  } else {
    currentFindingId.value = '';
    Object.assign(recordForm, {
      result: 'compliant',
      issueType: '',
      description: '',
      responsibleDepartment: '',
      responsiblePersonId: '',
    });
  }
  recordDialogVisible.value = true;
};

const handleSaveRecord = async () => {
  try {
    await recordFormRef.value.validate();
    recordSubmitting.value = true;

    const data = {
      planId,
      documentId: currentDocId.value,
      result: recordForm.result,
      ...(recordForm.result === 'non_compliant'
        ? {
            issueType: recordForm.issueType as FindingIssueType,
            description: recordForm.description,
            responsibleDepartment: recordForm.responsibleDepartment,
            responsiblePersonId: recordForm.responsiblePersonId,
            rectificationDeadline: defaultDeadline.value,
          }
        : {}),
    };

    let saved: AuditFinding;
    if (currentFindingId.value) {
      saved = await updateFinding(currentFindingId.value, data);
    } else {
      saved = await createFinding(data);
    }

    findingMap.value = { ...findingMap.value, [currentDocId.value]: saved };
    ElMessage.success('保存成功');
    recordDialogVisible.value = false;
  } catch (error: any) {
    if (error?.message) {
      ElMessage.error(error.message || '保存失败');
    }
  } finally {
    recordSubmitting.value = false;
  }
};

const handleSubmitReport = async () => {
  try {
    await ElMessageBox.confirm('确定要提交审核报告吗？提交后无法再修改审核结果。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    submitting.value = true;
    await submitAuditReport(planId);
    ElMessage.success('审核报告已提交');
    await fetchPlan();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交失败');
    }
  } finally {
    submitting.value = false;
  }
};

const handleWithdrawReport = async () => {
  try {
    await ElMessageBox.confirm('确定要撤回审核报告吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    submitting.value = true;
    await withdrawAuditReport(planId);
    ElMessage.success('审核报告已撤回');
    await fetchPlan();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '撤回失败');
    }
  } finally {
    submitting.value = false;
  }
};

const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

onMounted(() => {
  fetchPlan();
});
</script>

<style scoped>
.audit-execute {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h2 {
  margin: 0;
}

.header-right {
  display: flex;
  gap: 8px;
}

.plan-info {
  margin-bottom: 20px;
}

.progress-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  display: block;
}

.hint-text {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
}
</style>
