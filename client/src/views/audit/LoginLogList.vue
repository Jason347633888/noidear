<template>
  <div class="login-log-list">
    <el-card class="page-header">
      <h2>登录日志</h2>
      <p class="subtitle">查询和导出系统登录日志</p>
    </el-card>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="用户名">
              <el-input v-model="filterForm.username" placeholder="请输入用户名" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="IP地址">
              <el-input v-model="filterForm.ipAddress" placeholder="请输入IP地址" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="操作">
              <el-select v-model="filterForm.action" placeholder="请选择操作" clearable>
                <el-option label="登录" value="login" />
                <el-option label="登出" value="logout" />
                <el-option label="登录失败" value="login_failed" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="状态">
              <el-select v-model="filterForm.status" placeholder="请选择状态" clearable>
                <el-option label="成功" value="success" />
                <el-option label="失败" value="failed" />
              </el-select>
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
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
              <el-button :icon="Download" @click="handleExport" :loading="exporting">导出Excel</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="action" label="操作" width="100" :formatter="formatActionColumn" />
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="location" label="位置" width="120" />
        <el-table-column prop="loginTime" label="登录时间" width="160" :formatter="formatTimeColumn" />
        <el-table-column prop="logoutTime" label="登出时间" width="160" :formatter="formatLogoutColumn" />
        <el-table-column prop="status" label="状态" width="80" :formatter="formatStatusColumn" />
        <el-table-column prop="failReason" label="失败原因" min-width="150" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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

    <!-- 日志详情弹窗 -->
    <LogDetailDialog v-model="detailDialogVisible" title="登录日志详情" :data="selectedLog" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh, Download } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { queryLoginLogs, exportLoginLogs, type LoginLog } from '@/api/audit';
import LogDetailDialog from '@/components/audit/LogDetailDialog.vue';

const loading = ref(false);
const exporting = ref(false);
const detailDialogVisible = ref(false);
const timeRange = ref<[string, string]>();

const filterForm = reactive({
  username: '',
  ipAddress: '',
  action: '',
  status: '',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const tableData = ref<LoginLog[]>([]);
const selectedLog = ref<LoginLog>({} as LoginLog);

const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      username: filterForm.username || undefined,
      ipAddress: filterForm.ipAddress || undefined,
      action: filterForm.action || undefined,
      status: filterForm.status || undefined,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    };
    const { items, total } = await queryLoginLogs(params);
    tableData.value = items;
    pagination.total = total;
  } catch (error) {
    ElMessage.error('查询登录日志失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  Object.assign(filterForm, { username: '', ipAddress: '', action: '', status: '' });
  timeRange.value = undefined;
  pagination.page = 1;
  fetchData();
};

const handleExport = async () => {
  exporting.value = true;
  try {
    const params = {
      username: filterForm.username || undefined,
      ipAddress: filterForm.ipAddress || undefined,
      action: filterForm.action || undefined,
      status: filterForm.status || undefined,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    };
    const blob = await exportLoginLogs(params);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `login_logs_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
};

const handleViewDetail = (row: LoginLog) => {
  selectedLog.value = row;
  detailDialogVisible.value = true;
};

const formatTimeColumn = (row: LoginLog) => dayjs(row.loginTime).format('YYYY-MM-DD HH:mm:ss');
const formatLogoutColumn = (row: LoginLog) => row.logoutTime ? dayjs(row.logoutTime).format('YYYY-MM-DD HH:mm:ss') : '-';
const formatActionColumn = (row: LoginLog) => {
  const map: Record<string, string> = { login: '登录', logout: '登出', login_failed: '登录失败' };
  return map[row.action] || row.action;
};
const formatStatusColumn = (row: LoginLog) => row.status === 'success' ? '成功' : '失败';

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.login-log-list {
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
