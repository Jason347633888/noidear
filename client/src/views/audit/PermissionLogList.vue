<template>
  <div class="permission-log-list">
    <el-card class="page-header">
      <h2>权限变更日志</h2>
      <p class="subtitle">查询和导出权限变更日志</p>
    </el-card>

    <el-card class="filter-card">
      <el-form :model="filterForm" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="操作人">
              <el-input v-model="filterForm.operatorName" placeholder="请输入操作人" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="目标用户">
              <el-input v-model="filterForm.targetUsername" placeholder="请输入目标用户" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="操作类型">
              <el-select v-model="filterForm.action" placeholder="请选择操作类型" clearable>
                <el-option label="分配角色" value="assign_role" />
                <el-option label="撤销角色" value="revoke_role" />
                <el-option label="更换部门" value="change_department" />
                <el-option label="分配权限" value="assign_permission" />
                <el-option label="撤销权限" value="revoke_permission" />
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
        <el-table-column prop="operatorName" label="操作人" width="120" />
        <el-table-column prop="targetUsername" label="目标用户" width="120" />
        <el-table-column prop="action" label="操作类型" width="120" :formatter="formatActionColumn" />
        <el-table-column prop="beforeValue" label="变更前" width="150" />
        <el-table-column prop="afterValue" label="变更后" width="150" />
        <el-table-column prop="reason" label="原因" min-width="150" />
        <el-table-column prop="approvedByName" label="审批人" width="120" />
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

    <LogDetailDialog v-model="detailDialogVisible" title="权限变更日志详情" :data="selectedLog" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh, Download } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { queryPermissionLogs, exportPermissionLogs, type PermissionLog } from '@/api/audit';
import LogDetailDialog from '@/components/audit/LogDetailDialog.vue';

const loading = ref(false);
const exporting = ref(false);
const detailDialogVisible = ref(false);
const timeRange = ref<[string, string]>();

const filterForm = reactive({
  operatorName: '',
  targetUsername: '',
  action: '',
});

const pagination = reactive({ page: 1, limit: 20, total: 0 });
const tableData = ref<PermissionLog[]>([]);
const selectedLog = ref<PermissionLog>({} as PermissionLog);

const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      username: filterForm.operatorName || undefined,
      targetUsername: filterForm.targetUsername || undefined,
      action: filterForm.action || undefined,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    };
    const { items, total } = await queryPermissionLogs(params);
    tableData.value = items;
    pagination.total = total;
  } catch (error) {
    ElMessage.error('查询权限日志失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  Object.assign(filterForm, { operatorName: '', targetUsername: '', action: '' });
  timeRange.value = undefined;
  pagination.page = 1;
  fetchData();
};

const handleExport = async () => {
  exporting.value = true;
  try {
    const blob = await exportPermissionLogs({
      username: filterForm.operatorName || undefined,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `permission_logs_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
};

const handleViewDetail = (row: PermissionLog) => {
  selectedLog.value = row;
  detailDialogVisible.value = true;
};

const formatTimeColumn = (row: PermissionLog) => dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss');
const formatActionColumn = (row: PermissionLog) => {
  const map: Record<string, string> = {
    assign_role: '分配角色',
    revoke_role: '撤销角色',
    change_department: '更换部门',
    assign_permission: '分配权限',
    revoke_permission: '撤销权限',
  };
  return map[row.action] || row.action;
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.permission-log-list {
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
