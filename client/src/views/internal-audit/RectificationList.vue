<template>
  <div class="rectification-list">
    <el-card>
      <template #header>
        <div class="header">
          <h2>我的整改任务</h2>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" border>
        <el-table-column label="问题描述" min-width="200">
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="责任文档" min-width="160">
          <template #default="{ row }">
            {{ row.document?.title || row.documentId }}
          </template>
        </el-table-column>
        <el-table-column label="问题类型" width="130">
          <template #default="{ row }">
            <span>{{ formatIssueType(row.issueType) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="整改期限" width="130">
          <template #default="{ row }">
            <span :class="isOverdue(row.rectificationDeadline) ? 'overdue-text' : ''">
              {{ formatDate(row.rectificationDeadline) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending' || row.status === 'rectifying' || row.status === 'rejected'"
              link
              type="primary"
              size="small"
              @click="handleSubmitRectification(row)"
            >
              提交复审
            </el-button>
            <span v-else class="no-action">-</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
        class="pagination"
      />
    </el-card>

    <!-- 提交复审对话框 -->
    <el-dialog v-model="dialogVisible" title="提交整改复审" width="500px">
      <el-form :model="submitForm" :rules="submitRules" ref="submitFormRef" label-width="120px">
        <el-form-item label="整改后文档ID" prop="rectifiedDocumentId">
          <el-input
            v-model="submitForm.rectifiedDocumentId"
            placeholder="请输入整改后的文档 ID"
          />
        </el-form-item>
        <el-form-item label="整改说明">
          <el-input
            v-model="submitForm.rectificationComment"
            type="textarea"
            :rows="3"
            placeholder="请填写整改说明（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmSubmit" :loading="submitting">
          确定提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getMyRectifications,
  submitRectification,
  type AuditFinding,
  type FindingStatus,
} from '@/api/internal-audit/finding';

const loading = ref(false);
const submitting = ref(false);
const tableData = ref<AuditFinding[]>([]);
const dialogVisible = ref(false);
const submitFormRef = ref();
const currentFindingId = ref('');

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const submitForm = reactive({
  rectifiedDocumentId: '',
  rectificationComment: '',
});

const submitRules = {
  rectifiedDocumentId: [{ required: true, message: '请输入整改后的文档 ID', trigger: 'blur' }],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getMyRectifications({
      page: pagination.page,
      limit: pagination.limit,
    });
    tableData.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    ElMessage.error(error.message || '获取整改任务失败');
  } finally {
    loading.value = false;
  }
};

const handleSubmitRectification = (row: AuditFinding) => {
  currentFindingId.value = row.id;
  Object.assign(submitForm, { rectifiedDocumentId: '', rectificationComment: '' });
  dialogVisible.value = true;
};

const handleConfirmSubmit = async () => {
  try {
    await submitFormRef.value.validate();
    submitting.value = true;
    await submitRectification(currentFindingId.value, {
      rectifiedDocumentId: submitForm.rectifiedDocumentId,
      rectificationComment: submitForm.rectificationComment || undefined,
    });
    ElMessage.success('整改已提交，等待复审');
    dialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    if (error?.message) {
      ElMessage.error(error.message || '提交失败');
    }
  } finally {
    submitting.value = false;
  }
};

const formatIssueType = (type: string) => {
  const map: Record<string, string> = {
    needs_modification: '需要修改',
    missing_record: '缺失记录',
    missing_document: '文档缺失',
  };
  return map[type] || type || '-';
};

const formatStatus = (status: FindingStatus) => {
  const map: Record<FindingStatus, string> = {
    pending: '待整改',
    rectifying: '整改中',
    pending_verification: '待复审',
    verified: '已通过',
    rejected: '已驳回',
  };
  return map[status] || status;
};

const statusTagType = (status: FindingStatus) => {
  const map: Record<FindingStatus, string> = {
    pending: 'info',
    rectifying: 'warning',
    pending_verification: 'primary',
    verified: 'success',
    rejected: 'danger',
  };
  return map[status] || 'info';
};

const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

const isOverdue = (deadline?: string) => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.rectification-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.overdue-text {
  color: var(--el-color-danger);
  font-weight: 500;
}

.no-action {
  color: var(--el-text-color-placeholder);
}
</style>
