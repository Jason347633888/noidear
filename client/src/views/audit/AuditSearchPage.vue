<template>
  <div class="audit-search-page">
    <el-card class="page-header">
      <h2>综合日志搜索</h2>
      <p class="subtitle">跨类型搜索系统审计日志</p>
    </el-card>

    <!-- 搜索表单 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="关键字">
              <el-input
                v-model="filterForm.keyword"
                placeholder="用户名/IP/资源名"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
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
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleSearch" :loading="loading">
                搜索
              </el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 搜索结果 -->
    <template v-if="hasSearched">
      <!-- 登录日志结果 -->
      <el-card class="result-card" v-if="results.loginLogs.length > 0">
        <template #header>
          <div class="card-header">
            <el-icon><Key /></el-icon>
            <span>登录日志（{{ results.loginLogs.length }} 条）</span>
          </div>
        </template>
        <el-table :data="results.loginLogs" stripe size="small">
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="action" label="操作" width="100">
            <template #default="{ row }">
              <el-tag :type="row.action === 'login_failed' ? 'danger' : 'success'" size="small">
                {{ formatLoginAction(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ipAddress" label="IP地址" width="140" />
          <el-table-column prop="loginTime" label="时间" width="160">
            <template #default="{ row }">{{ formatTime(row.loginTime) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                {{ row.status === 'success' ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="failReason" label="失败原因" min-width="150" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewDetail(row, '登录日志详情')">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 权限变更日志结果 -->
      <el-card class="result-card" v-if="results.permissionLogs.length > 0">
        <template #header>
          <div class="card-header">
            <el-icon><Setting /></el-icon>
            <span>权限变更日志（{{ results.permissionLogs.length }} 条）</span>
          </div>
        </template>
        <el-table :data="results.permissionLogs" stripe size="small">
          <el-table-column prop="operatorName" label="操作人" width="120" />
          <el-table-column prop="targetUsername" label="目标用户" width="120" />
          <el-table-column prop="action" label="操作类型" width="150">
            <template #default="{ row }">
              <el-tag type="warning" size="small">{{ formatPermissionAction(row.action) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="beforeValue" label="变更前" min-width="120" />
          <el-table-column prop="afterValue" label="变更后" min-width="120" />
          <el-table-column prop="createdAt" label="时间" width="160">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewDetail(row, '权限变更日志详情')">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 敏感操作日志结果 -->
      <el-card class="result-card" v-if="results.sensitiveLogs.length > 0">
        <template #header>
          <div class="card-header">
            <el-icon><Warning /></el-icon>
            <span>敏感操作日志（{{ results.sensitiveLogs.length }} 条）</span>
          </div>
        </template>
        <el-table :data="results.sensitiveLogs" stripe size="small">
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="action" label="操作类型" width="130">
            <template #default="{ row }">
              <el-tag type="danger" size="small">{{ formatSensitiveAction(row.action) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="resourceType" label="资源类型" width="100" />
          <el-table-column prop="resourceName" label="资源名称" min-width="150" />
          <el-table-column prop="ipAddress" label="IP地址" width="140" />
          <el-table-column prop="createdAt" label="时间" width="160">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewDetail(row, '敏感操作日志详情')">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 无结果提示 -->
      <el-card v-if="totalCount === 0">
        <el-empty description="未找到相关日志记录" />
      </el-card>

      <!-- 结果统计 -->
      <el-card v-if="totalCount > 0" class="summary-card">
        <div class="summary-content">
          <span>共找到 <strong>{{ totalCount }}</strong> 条日志记录：</span>
          <el-tag type="success" size="small" class="summary-tag">
            登录日志 {{ results.loginLogs.length }} 条
          </el-tag>
          <el-tag type="warning" size="small" class="summary-tag">
            权限变更 {{ results.permissionLogs.length }} 条
          </el-tag>
          <el-tag type="danger" size="small" class="summary-tag">
            敏感操作 {{ results.sensitiveLogs.length }} 条
          </el-tag>
        </div>
      </el-card>
    </template>

    <!-- 初始提示 -->
    <el-card v-else class="hint-card">
      <el-empty description="请输入搜索条件查询日志" />
    </el-card>

    <!-- 日志详情弹窗 -->
    <LogDetailDialog
      v-model="detailDialogVisible"
      :title="detailTitle"
      :data="selectedLog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh, Key, Setting, Warning } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { searchLogs, type LoginLog, type PermissionLog, type SensitiveLog } from '@/api/audit';
import LogDetailDialog from '@/components/audit/LogDetailDialog.vue';

const loading = ref(false);
const hasSearched = ref(false);
const detailDialogVisible = ref(false);
const detailTitle = ref('日志详情');
const timeRange = ref<[string, string] | undefined>(undefined);

const filterForm = reactive({
  keyword: '',
  username: '',
  ipAddress: '',
});

const results = reactive<{
  loginLogs: LoginLog[];
  permissionLogs: PermissionLog[];
  sensitiveLogs: SensitiveLog[];
}>({
  loginLogs: [],
  permissionLogs: [],
  sensitiveLogs: [],
});

const selectedLog = ref<Record<string, any>>({});

const totalCount = computed(
  () => results.loginLogs.length + results.permissionLogs.length + results.sensitiveLogs.length,
);

const handleSearch = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: filterForm.keyword || undefined,
      username: filterForm.username || undefined,
      ipAddress: filterForm.ipAddress || undefined,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    };
    const data = await searchLogs(params);
    results.loginLogs = data.loginLogs || [];
    results.permissionLogs = data.permissionLogs || [];
    results.sensitiveLogs = data.sensitiveLogs || [];
    hasSearched.value = true;
  } catch (error) {
    ElMessage.error('搜索日志失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handleReset = () => {
  Object.assign(filterForm, { keyword: '', username: '', ipAddress: '' });
  timeRange.value = undefined;
  hasSearched.value = false;
  results.loginLogs = [];
  results.permissionLogs = [];
  results.sensitiveLogs = [];
};

const handleViewDetail = (row: Record<string, any>, title: string) => {
  selectedLog.value = row;
  detailTitle.value = title;
  detailDialogVisible.value = true;
};

const formatTime = (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

const formatLoginAction = (action: string) => {
  const map: Record<string, string> = { login: '登录', logout: '登出', login_failed: '登录失败' };
  return map[action] || action;
};

const formatPermissionAction = (action: string) => {
  const map: Record<string, string> = {
    assign_role: '分配角色',
    revoke_role: '撤销角色',
    change_department: '变更部门',
    assign_permission: '授予权限',
    revoke_permission: '撤销权限',
  };
  return map[action] || action;
};

const formatSensitiveAction = (action: string) => {
  const map: Record<string, string> = {
    delete_document: '删除文档',
    export_data: '导出数据',
    approve: '审批通过',
    reject: '审批驳回',
    delete_user: '删除用户',
    reset_password: '重置密码',
  };
  return map[action] || action;
};
</script>

<style scoped>
.audit-search-page {
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

.result-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.summary-card {
  margin-bottom: 16px;
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.summary-tag {
  margin: 0;
}

.hint-card {
  padding: 40px 0;
}
</style>
