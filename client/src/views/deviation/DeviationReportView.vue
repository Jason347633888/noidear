<template>
  <div class="deviation-report-view">
    <div class="page-header">
      <h2>偏离报告管理</h2>
    </div>

    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 150px;">
            <el-option value="pending" label="待审批" />
            <el-option value="approved" label="已通过" />
            <el-option value="rejected" label="已拒绝" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px;"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filterForm.keyword"
            placeholder="字段名/任务ID"
            clearable
            style="width: 200px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" v-loading="loading">
      <el-table :data="tableData" stripe border>
        <el-table-column prop="id" label="报告ID" width="180" show-overflow-tooltip />
        <el-table-column prop="taskRecordId" label="任务记录ID" width="180" show-overflow-tooltip />
        <el-table-column prop="fieldName" label="偏离字段" width="120" />
        <el-table-column label="期望值" width="100">
          <template #default="{ row }">{{ row.expectedValue }}</template>
        </el-table-column>
        <el-table-column label="实际值" width="100">
          <template #default="{ row }">{{ row.actualValue }}</template>
        </el-table-column>
        <el-table-column label="偏离率" width="100">
          <template #default="{ row }">
            <el-tag :type="getDeviationRateType(row.deviationRate)" size="small">
              {{ row.deviationRate > 0 ? '+' : '' }}{{ row.deviationRate.toFixed(2) }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitter.name" label="提交人" width="100" />
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">
              查看详情
            </el-button>
            <template v-if="row.status === 'pending'">
              <el-button type="success" link size="small" @click="handleApprove(row)">
                通过
              </el-button>
              <el-button type="danger" link size="small" @click="handleReject(row)">
                拒绝
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchData"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="偏离报告详情" width="600px">
      <el-descriptions :column="1" border v-if="currentReport">
        <el-descriptions-item label="报告ID">{{ currentReport.id }}</el-descriptions-item>
        <el-descriptions-item label="任务记录ID">{{ currentReport.taskRecordId }}</el-descriptions-item>
        <el-descriptions-item label="字段名">{{ currentReport.fieldName }}</el-descriptions-item>
        <el-descriptions-item label="期望值">{{ currentReport.expectedValue }}</el-descriptions-item>
        <el-descriptions-item label="实际值">{{ currentReport.actualValue }}</el-descriptions-item>
        <el-descriptions-item label="偏离量">
          {{ currentReport.deviationValue > 0 ? '+' : '' }}{{ currentReport.deviationValue.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="偏离率">
          <el-tag :type="getDeviationRateType(currentReport.deviationRate)" size="small">
            {{ currentReport.deviationRate > 0 ? '+' : '' }}{{ currentReport.deviationRate.toFixed(2) }}%
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="偏离原因">{{ currentReport.reason }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentReport.status)">{{ getStatusText(currentReport.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="提交人">{{ currentReport.submitter?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatDate(currentReport.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="审批人" v-if="currentReport.approver">
          {{ currentReport.approver.name }}
        </el-descriptions-item>
        <el-descriptions-item label="审批时间" v-if="currentReport.approvedAt">
          {{ formatDate(currentReport.approvedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="审批意见" v-if="currentReport.comment">
          {{ currentReport.comment }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 审批弹窗 -->
    <el-dialog v-model="approveVisible" title="审批偏离报告" width="500px">
      <el-form :model="approveForm" :rules="approveRules" ref="approveFormRef" label-width="100px">
        <el-form-item label="审批操作">
          <el-radio-group v-model="approveForm.action">
            <el-radio value="approve">通过</el-radio>
            <el-radio value="reject">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批意见" prop="comment">
          <el-input
            v-model="approveForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入审批意见（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitApprove" :loading="submitting">
          提交审批
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import deviationApi, { type DeviationReport } from '@/api/deviation';

const loading = ref(false);
const submitting = ref(false);
const tableData = ref<DeviationReport[]>([]);
const detailVisible = ref(false);
const approveVisible = ref(false);
const currentReport = ref<DeviationReport | null>(null);
const approveFormRef = ref<FormInstance>();
const dateRange = ref<[string, string] | null>(null);

const filterForm = reactive({
  status: '',
  keyword: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const approveForm = reactive({
  action: 'approve' as 'approve' | 'reject',
  comment: '',
});

const approveRules: FormRules = {
  comment: [
    { max: 200, message: '审批意见不超过200字符', trigger: 'blur' },
  ],
};

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  };
  return map[status] || 'info';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝',
  };
  return map[status] || status;
};

const getDeviationRateType = (rate: number) => {
  const absRate = Math.abs(rate);
  if (absRate < 5) return 'success';
  if (absRate < 10) return 'warning';
  return 'danger';
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN');
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };

    if (filterForm.status) {
      params.status = filterForm.status;
    }
    if (filterForm.keyword) {
      params.keyword = filterForm.keyword;
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    const res = await deviationApi.getDeviationReports(params);
    tableData.value = res.items || [];
    pagination.total = res.total || 0;
  } catch {
    ElMessage.error('获取偏离报告列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.status = '';
  filterForm.keyword = '';
  dateRange.value = null;
  pagination.page = 1;
  fetchData();
};

const handleSizeChange = () => {
  pagination.page = 1;
  fetchData();
};

const handleViewDetail = (row: DeviationReport) => {
  currentReport.value = row;
  detailVisible.value = true;
};

const handleApprove = (row: DeviationReport) => {
  currentReport.value = row;
  approveForm.action = 'approve';
  approveForm.comment = '';
  approveVisible.value = true;
};

const handleReject = (row: DeviationReport) => {
  currentReport.value = row;
  approveForm.action = 'reject';
  approveForm.comment = '';
  approveVisible.value = true;
};

const handleSubmitApprove = async () => {
  if (!approveFormRef.value || !currentReport.value) return;

  try {
    await approveFormRef.value.validate();
    submitting.value = true;

    await deviationApi.approveDeviationReport(currentReport.value.id, {
      action: approveForm.action,
      comment: approveForm.comment || undefined,
    });

    ElMessage.success(approveForm.action === 'approve' ? '审批通过' : '已拒绝');
    approveVisible.value = false;
    fetchData();
  } catch {
    // Error handled by interceptor or validation
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.deviation-report-view {
  padding: 0;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.filter-card {
  margin-bottom: 16px;
}

.table-card {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
