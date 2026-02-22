<template>
  <div class="verification-list">
    <el-card>
      <template #header>
        <div class="header">
          <h2>复审验证</h2>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" border>
        <el-table-column label="问题描述" min-width="200">
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="整改文档" min-width="160">
          <template #default="{ row }">
            {{ row.rectifiedDocumentId || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="整改时间" width="150">
          <template #default="{ row }">
            {{ formatDateTime(row.rectifiedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="整改人" width="120">
          <template #default="{ row }">
            {{ row.responsiblePerson?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="整改说明" min-width="180">
          <template #default="{ row }">
            {{ row.rectificationComment || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="success" size="small" @click="handleVerify(row)">
              通过验证
            </el-button>
            <el-button link type="danger" size="small" @click="handleReject(row)">
              驳回
            </el-button>
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

    <!-- 驳回对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回整改" width="500px">
      <el-form :model="rejectForm" :rules="rejectRules" ref="rejectFormRef" label-width="100px">
        <el-form-item label="驳回原因" prop="reason">
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请填写驳回原因（必填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleConfirmReject" :loading="actionLoading">
          确定驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getPendingVerifications,
  verifyFinding,
  rejectFinding,
  type AuditFinding,
} from '@/api/internal-audit/finding';

const loading = ref(false);
const actionLoading = ref(false);
const tableData = ref<AuditFinding[]>([]);
const rejectDialogVisible = ref(false);
const rejectFormRef = ref();
const currentFindingId = ref('');

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const rejectForm = reactive({
  reason: '',
});

const rejectRules = {
  reason: [
    { required: true, message: '请填写驳回原因', trigger: 'blur' },
    { min: 5, message: '驳回原因至少5个字符', trigger: 'blur' },
  ],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getPendingVerifications({
      page: pagination.page,
      limit: pagination.limit,
    });
    tableData.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    ElMessage.error(error.message || '获取待复审列表失败');
  } finally {
    loading.value = false;
  }
};

const handleVerify = async (row: AuditFinding) => {
  try {
    await ElMessageBox.confirm('确定通过该整改验证吗？', '提示', {
      confirmButtonText: '确定通过',
      cancelButtonText: '取消',
      type: 'success',
    });
    actionLoading.value = true;
    await verifyFinding(row.id);
    ElMessage.success('验证通过');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  } finally {
    actionLoading.value = false;
  }
};

const handleReject = (row: AuditFinding) => {
  currentFindingId.value = row.id;
  rejectForm.reason = '';
  rejectDialogVisible.value = true;
};

const handleConfirmReject = async () => {
  try {
    await rejectFormRef.value.validate();
    actionLoading.value = true;
    await rejectFinding(currentFindingId.value, { reason: rejectForm.reason });
    ElMessage.success('已驳回，整改人将重新整改');
    rejectDialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    if (error?.message) {
      ElMessage.error(error.message || '驳回失败');
    }
  } finally {
    actionLoading.value = false;
  }
};

const formatDateTime = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.verification-list {
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
</style>
