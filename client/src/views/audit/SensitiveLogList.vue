<template>
  <div class="sensitive-log-list">
    <el-card class="page-header">
      <h2>敏感操作日志</h2>
      <p class="subtitle">查询和导出敏感操作日志</p>
    </el-card>

    <el-card class="filter-card">
      <el-form :model="filterForm" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="用户名">
              <el-input v-model="filterForm.username" placeholder="请输入用户名" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="操作类型">
              <el-select v-model="filterForm.action" placeholder="请选择操作类型" clearable>
                <el-option label="删除文档" value="delete_document" />
                <el-option label="导出数据" value="export_data" />
                <el-option label="审批通过" value="approve" />
                <el-option label="审批拒绝" value="reject" />
                <el-option label="删除用户" value="delete_user" />
                <el-option label="重置密码" value="reset_password" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="资源类型">
              <el-select v-model="filterForm.resourceType" placeholder="请选择资源类型" clearable>
                <el-option label="文档" value="document" />
                <el-option label="用户" value="user" />
                <el-option label="角色" value="role" />
                <el-option label="任务" value="task" />
                <el-option label="审批" value="approval" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="timeRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label=" ">
              <el-button :icon="Download" @click="handleExport" :loading="exporting">导出Excel</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="action" label="操作类型" width="120" :formatter="formatActionColumn" />
        <el-table-column prop="resourceType" label="资源类型" width="100" :formatter="formatResourceTypeColumn" />
        <el-table-column prop="resourceName" label="资源名称" min-width="150" />
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="details" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="160" :formatter="formatTimeColumn" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <LogDetailDialog v-model="detailDialogVisible" title="敏感操作日志详情" :data="selectedLog" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh, Download } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { querySensitiveLogs, exportSensitiveLogs, type SensitiveLog } from '@/api/audit';
import LogDetailDialog from '@/components/audit/LogDetailDialog.vue';

const ACTION_MAP: Record<string, string> = {
  delete_document: '删除文档',
  export_data: '导出数据',
  approve: '审批通过',
  reject: '审批拒绝',
  delete_user: '删除用户',
  reset_password: '重置密码',
};

const RESOURCE_TYPE_MAP: Record<string, string> = {
  document: '文档',
  user: '用户',
  role: '角色',
  task: '任务',
  approval: '审批',
};

const loading = ref(false);
const exporting = ref(false);
const detailDialogVisible = ref(false);
const timeRange = ref<[string, string]>();

const filterForm = reactive({
  username: '',
  action: '',
  resourceType: '',
});

const pagination = reactive({ page: 1, limit: 20, total: 0 });
const tableData = ref<SensitiveLog[]>([]);
const selectedLog = ref<SensitiveLog>({} as SensitiveLog);

const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      username: filterForm.username || undefined,
      action: filterForm.action || undefined,
      resourceType: filterForm.resourceType || undefined,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    };
    const { items, total } = await querySensitiveLogs(params);
    tableData.value = items;
    pagination.total = total;
  } catch (error) {
    ElMessage.error('查询敏感日志失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  Object.assign(filterForm, { username: '', action: '', resourceType: '' });
  timeRange.value = undefined;
  pagination.page = 1;
  fetchData();
};

const handleExport = async () => {
  exporting.value = true;
  try {
    const blob = await exportSensitiveLogs({
      username: filterForm.username || undefined,
      action: filterForm.action || undefined,
      resourceType: filterForm.resourceType || undefined,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sensitive_logs_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
};

const handleViewDetail = (row: SensitiveLog) => {
  selectedLog.value = row;
  detailDialogVisible.value = true;
};

const formatTimeColumn = (row: SensitiveLog) => dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss');
const formatActionColumn = (row: SensitiveLog) => ACTION_MAP[row.action] || row.action;
const formatResourceTypeColumn = (row: SensitiveLog) => RESOURCE_TYPE_MAP[row.resourceType] || row.resourceType;

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.sensitive-log-list {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.filter-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
