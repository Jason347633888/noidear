<template>
  <div class="monitoring-dashboard">
    <!-- Header -->
    <el-card class="page-header">
      <div class="header-content">
        <div>
          <h2>运维监控大屏</h2>
          <p class="subtitle">实时监控系统状态和性能指标</p>
        </div>
        <div class="header-actions">
          <el-button :icon="FullScreen" @click="toggleFullScreen">
            {{ isFullScreen ? '退出全屏' : '全屏显示' }}
          </el-button>
          <el-button
            :icon="autoRefresh ? VideoPause : VideoPlay"
            @click="toggleAutoRefresh"
          >
            {{ autoRefresh ? '暂停刷新' : '自动刷新' }}
          </el-button>
          <el-button :icon="Refresh" :loading="loading" @click="fetchAllData">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 系统健康状态 -->
    <el-row :gutter="20" class="health-row">
      <el-col :span="6">
        <HealthStatusCard
          title="PostgreSQL"
          :status="healthData.services?.postgres?.status || 'unhealthy'"
          icon="database"
          :latency="healthData.services?.postgres?.latency"
          :error="healthData.services?.postgres?.error"
        />
      </el-col>
      <el-col :span="6">
        <HealthStatusCard
          title="Redis"
          :status="healthData.services?.redis?.status || 'unhealthy'"
          icon="redis"
          :latency="healthData.services?.redis?.latency"
          :error="healthData.services?.redis?.error"
        />
      </el-col>
      <el-col :span="6">
        <HealthStatusCard
          title="MinIO"
          :status="healthData.services?.minio?.status || 'unhealthy'"
          icon="minio"
          :latency="healthData.services?.minio?.latency"
          :error="healthData.services?.minio?.error"
        />
      </el-col>
      <el-col :span="6">
        <HealthStatusCard
          title="磁盘空间"
          :status="healthData.services?.disk?.status || 'unhealthy'"
          icon="disk"
          :metrics="{
            '可用空间': healthData.services?.disk?.available || 'N/A',
            '使用率': healthData.services?.disk?.usage ? `${healthData.services.disk.usage}%` : 'N/A'
          }"
        />
      </el-col>
    </el-row>

    <!-- 业务指标 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <MetricCard
          label="今日文档上传"
          :value="auditStats.todayDocumentUploads || 0"
          icon="document"
          color="primary"
        />
      </el-col>
      <el-col :span="6">
        <MetricCard
          label="今日审批"
          :value="auditStats.todayApprovals || 0"
          icon="check"
          color="success"
        />
      </el-col>
      <el-col :span="6">
        <MetricCard
          label="在线用户"
          :value="auditStats.onlineUsers || 0"
          icon="user"
          color="info"
        />
      </el-col>
      <el-col :span="6">
        <MetricCard
          label="今日登录"
          :value="auditStats.todayLogins || 0"
          icon="calendar"
          color="warning"
        />
      </el-col>
    </el-row>

    <!-- 告警和日志统计 -->
    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <AlertList
          :alerts="recentAlerts"
          @refresh="fetchAlertHistory"
          @acknowledge="handleAcknowledgeAlert"
          @show-more="goToAlertHistory"
        />
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>操作日志统计</span>
          </template>
          <div class="log-stats">
            <div class="stat-item">
              <span class="label">今日登录次数</span>
              <span class="value">{{ auditStats.todayLogins || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="label">今日敏感操作</span>
              <span class="value">{{ auditStats.todaySensitiveOps || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="label">异常登录</span>
              <span class="value danger">{{ auditStats.abnormalLogins || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="label">未确认告警</span>
              <span class="value warning">{{ auditStats.pendingAlerts || 0 }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近更新时间 -->
    <div v-if="lastUpdateTime" class="last-update">
      最后更新: {{ formatDateTime(lastUpdateTime) }}
      <span v-if="autoRefresh" class="next-refresh">
        | 下次刷新: {{ countdown }}s
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { FullScreen, Refresh, VideoPlay, VideoPause } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

import { getHealth, type HealthCheckResponse } from '@/api/health';
import { getDashboardStats } from '@/api/audit';
import { queryAlertHistory, acknowledgeAlert, type AlertHistory } from '@/api/monitoring';
import HealthStatusCard from '@/components/monitoring/HealthStatusCard.vue';
import MetricCard from '@/components/monitoring/MetricCard.vue';
import AlertList from '@/components/monitoring/AlertList.vue';

const router = useRouter();
const loading = ref(false);
const isFullScreen = ref(false);
const autoRefresh = ref(true);
const countdown = ref(30);
const lastUpdateTime = ref<string>('');

const healthData = ref<HealthCheckResponse>({
  status: 'unhealthy',
  timestamp: '',
  services: {
    postgres: { status: 'unhealthy' },
    redis: { status: 'unhealthy' },
    minio: { status: 'unhealthy' },
    disk: { status: 'unhealthy', available: 'N/A', usage: 0 },
  },
});

const auditStats = ref({
  todayLogins: 0,
  todaySensitiveOps: 0,
  abnormalLogins: 0,
  pendingAlerts: 0,
  todayDocumentUploads: 0,
  todayApprovals: 0,
  onlineUsers: 0,
});

const recentAlerts = ref<AlertHistory[]>([]);

let refreshTimer: number | null = null;
let countdownTimer: number | null = null;

const fetchHealthData = async () => {
  const data = await getHealth();
  healthData.value = data;
};

const fetchAuditStats = async () => {
  const data = await getDashboardStats();
  auditStats.value = {
    ...auditStats.value,
    ...data,
  };
};

const fetchAlertHistory = async () => {
  const { items } = await queryAlertHistory({
    page: 1,
    limit: 5,
    status: 'triggered',
  });
  recentAlerts.value = items;
  auditStats.value.pendingAlerts = items.length;
};

const fetchAllData = async () => {
  loading.value = true;
  try {
    const results = await Promise.allSettled([
      fetchHealthData(),
      fetchAuditStats(),
      fetchAlertHistory(),
    ]);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      ElMessage.warning('部分数据加载失败，已显示可用数据');
    }
    lastUpdateTime.value = new Date().toISOString();
    resetCountdown();
  } catch (error) {
    ElMessage.error('刷新数据失败');
  } finally {
    loading.value = false;
  }
};

const handleAcknowledgeAlert = async (id: string) => {
  try {
    await acknowledgeAlert(id);
    ElMessage.success('告警已确认');
    fetchAlertHistory();
  } catch (error) {
    ElMessage.error('确认告警失败');
  }
};

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullScreen.value = true;
  } else {
    document.exitFullscreen();
    isFullScreen.value = false;
  }
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
};

const startAutoRefresh = () => {
  refreshTimer = window.setInterval(() => {
    fetchAllData();
  }, 30000);

  countdownTimer = window.setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      countdown.value = 30;
    }
  }, 1000);
};

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

const resetCountdown = () => {
  countdown.value = 30;
};

const goToAlertHistory = () => {
  router.push('/monitoring/alerts/history');
};

const formatDateTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
};

onMounted(() => {
  fetchAllData();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.monitoring-dashboard {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 24px;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.health-row,
.metrics-row,
.content-row {
  margin-bottom: 20px;
}

.log-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.stat-item .label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.stat-item .value {
  font-size: 20px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.stat-item .value.danger {
  color: #f56c6c;
}

.stat-item .value.warning {
  color: #e6a23c;
}

.last-update {
  text-align: center;
  padding: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.next-refresh {
  margin-left: 8px;
  color: var(--el-color-primary);
}
</style>
