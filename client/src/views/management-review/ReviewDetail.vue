<template>
  <div class="management-review-detail" v-loading="loading">
    <div class="page-header">
      <div>
        <h2>{{ review?.title || '管理评审详情' }}</h2>
        <p>{{ review?.year }} 年 · {{ review?.status }}</p>
      </div>
      <el-button type="primary" :loading="collecting" @click="collectSources">收集输入材料</el-button>
    </div>

    <el-tabs>
      <el-tab-pane label="输入材料">
        <el-table :data="review?.inputs || []" border>
          <el-table-column prop="sourceType" label="来源" width="150" />
          <el-table-column prop="department" label="部门" width="150" />
          <el-table-column prop="title" label="标题" min-width="220" />
          <el-table-column label="摘要" min-width="260">
            <template #default="{ row }">
              <pre>{{ formatSummary(row.summary) }}</pre>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="改进措施">
        <div class="action-bar">
          <el-button @click="actionDialogVisible = true">新增改进措施</el-button>
        </div>
        <el-table :data="review?.actions || []" border>
          <el-table-column prop="action" label="改进措施" min-width="260" />
          <el-table-column prop="responsibleDepartment" label="责任部门" width="160" />
          <el-table-column prop="status" label="状态" width="140" />
          <el-table-column prop="dueDate" label="期限" width="150">
            <template #default="{ row }">{{ formatDate(row.dueDate) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="actionDialogVisible" title="新增改进措施" width="560px">
      <el-form :model="actionForm" label-width="110px">
        <el-form-item label="改进措施" required>
          <el-input v-model="actionForm.action" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="责任部门" required>
          <el-input v-model="actionForm.responsibleDepartment" />
        </el-form-item>
        <el-form-item label="期限">
          <el-date-picker v-model="actionForm.dueDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingAction" @click="createAction">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { managementReviewApi, type ManagementReview } from '@/api/management-review';

const route = useRoute();
const reviewId = route.params.id as string;
const loading = ref(false);
const collecting = ref(false);
const savingAction = ref(false);
const actionDialogVisible = ref(false);
const review = ref<ManagementReview | null>(null);
const actionForm = reactive({
  action: '',
  responsibleDepartment: '',
  dueDate: '',
});

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

function formatSummary(summary: Record<string, unknown>) {
  return JSON.stringify(summary, null, 2);
}

async function loadReview() {
  loading.value = true;
  try {
    const res = await managementReviewApi.get(reviewId);
    review.value = (res as any).data || res;
  } finally {
    loading.value = false;
  }
}

async function collectSources() {
  collecting.value = true;
  try {
    const res = await managementReviewApi.collectSources(reviewId);
    const result = (res as any).data || res;
    ElMessage.success(`已收集 ${result.auditReports} 份内审报告、${result.trainingArchives} 份培训档案`);
    await loadReview();
  } finally {
    collecting.value = false;
  }
}

async function createAction() {
  if (!actionForm.action.trim() || !actionForm.responsibleDepartment.trim()) {
    ElMessage.warning('改进措施和责任部门不能为空');
    return;
  }
  savingAction.value = true;
  try {
    await managementReviewApi.createAction(reviewId, { ...actionForm });
    ElMessage.success('已新增改进措施');
    actionDialogVisible.value = false;
    actionForm.action = '';
    actionForm.responsibleDepartment = '';
    actionForm.dueDate = '';
    await loadReview();
  } finally {
    savingAction.value = false;
  }
}

onMounted(loadReview);
</script>

<style scoped>
.management-review-detail {
  padding: 16px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-header p {
  margin: 4px 0 0;
  color: #606266;
}
.action-bar {
  margin-bottom: 12px;
}
pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 12px;
}
</style>
