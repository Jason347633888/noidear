<template>
  <div class="my-workflow-tasks">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="pending" label="待处理" />
            <el-option value="approved" label="已通过" />
            <el-option value="rejected" label="已驳回" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>我的工作流待办</span>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="instanceId" label="实例ID" width="100" show-overflow-tooltip />
        <el-table-column label="步骤" width="80">
          <template #default="{ row }">
            第 {{ row.stepIndex + 1 }} 步
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="taskStatusType(row.status)" size="small">
              {{ taskStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="接收时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button link type="success" @click="handleApprove(row)">
                通过
              </el-button>
              <el-button link type="danger" @click="handleReject(row)">
                驳回
              </el-button>
            </template>
            <span v-else class="text-muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 审批对话框 -->
    <el-dialog v-model="approveDialogVisible" title="审批意见" width="500px">
      <el-form>
        <el-form-item label="意见">
          <el-input v-model="approveComment" type="textarea" :rows="3" placeholder="请输入审批意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmApprove" :loading="approving">确认</el-button>
      </template>
    </el-dialog>

    <!-- 驳回对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回原因" width="500px">
      <el-form>
        <el-form-item label="原因" required>
          <el-input v-model="rejectComment" type="textarea" :rows="3" placeholder="请输入驳回原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="rejecting">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import workflowApi, { type WorkflowTask } from '@/api/workflow';

const loading = ref(false);
const tableData = ref<WorkflowTask[]>([]);
const approveDialogVisible = ref(false);
const rejectDialogVisible = ref(false);
const approveComment = ref('');
const rejectComment = ref('');
const approving = ref(false);
const rejecting = ref(false);
const currentTask = ref<WorkflowTask | null>(null);

const filterForm = reactive({ status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const taskStatusText = (status: string): string => {
  const map: Record<string, string> = { pending: '待处理', approved: '已通过', rejected: '已驳回', cancelled: '已取消' };
  return map[status] || status;
};

const taskStatusType = (status: string): string => {
  const map: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'info' };
  return map[status] || 'info';
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await workflowApi.getMyTasks({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取待办列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.status = ''; handleSearch(); };

const handleApprove = (task: WorkflowTask) => {
  currentTask.value = task;
  approveComment.value = '';
  approveDialogVisible.value = true;
};

const handleReject = (task: WorkflowTask) => {
  currentTask.value = task;
  rejectComment.value = '';
  rejectDialogVisible.value = true;
};

const confirmApprove = async () => {
  if (!currentTask.value) return;
  approving.value = true;
  try {
    await workflowApi.approveTask(currentTask.value.id, approveComment.value || undefined);
    ElMessage.success('审批通过');
    approveDialogVisible.value = false;
    fetchData();
  } catch (error) {
    // 错误由拦截器处理
  } finally {
    approving.value = false;
  }
};

const confirmReject = async () => {
  if (!currentTask.value) return;
  if (!rejectComment.value.trim()) {
    ElMessage.warning('请输入驳回原因');
    return;
  }
  rejecting.value = true;
  try {
    await workflowApi.rejectTask(currentTask.value.id, rejectComment.value);
    ElMessage.success('已驳回');
    rejectDialogVisible.value = false;
    fetchData();
  } catch (error) {
    // 错误由拦截器处理
  } finally {
    rejecting.value = false;
  }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.text-muted { color: #909399; }
</style>
