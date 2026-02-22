<template>
  <div class="health-page">
    <el-card class="page-header">
      <div class="header-content">
        <div>
          <h2>系统健康检查</h2>
          <p class="subtitle">查看所有依赖服务的健康状态</p>
        </div>
        <div class="header-actions">
          <el-switch
            v-model="autoRefresh"
            active-text="自动刷新"
            inactive-text="手动刷新"
            @change="toggleAutoRefresh"
          />
          <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- 总体健康状态 -->
    <el-card class="overall-status">
      <div class="status-content">
        <el-icon :size="48" :class="`status-icon status-${healthData.status}`">
          <component :is="getOverallIcon()" />
        </el-icon>
        <div class="status-info">
          <div class="status-label">总体状态</div>
          <div class="status-value" :class="`status-${healthData.status}`">
            {{ formatStatus(healthData.status) }}
          </div>
          <div class="status-time">最后检查: {{ formatDateTime(healthData.timestamp) }}</div>
        </div>
      </div>
    </el-card>

    <!-- 服务健康状态 -->
    <el-row :gutter="20" class="services-row">
      <el-col :span="12">
        <HealthStatusCard
          title="PostgreSQL"
          :status="healthData.services?.postgres?.status || 'unhealthy'"
          icon="database"
          :latency="healthData.services?.postgres?.latency"
          :error="healthData.services?.postgres?.error"
        />
      </el-col>
      <el-col :span="12">
        <HealthStatusCard
          title="Redis"
          :status="healthData.services?.redis?.status || 'unhealthy'"
          icon="redis"
          :latency="healthData.services?.redis?.latency"
          :error="healthData.services?.redis?.error"
        />
      </el-col>
    </el-row>

    <el-row :gutter="20" class="services-row">
      <el-col :span="12">
        <HealthStatusCard
          title="MinIO"
          :status="healthData.services?.minio?.status || 'unhealthy'"
          icon="minio"
          :latency="healthData.services?.minio?.latency"
          :error="healthData.services?.minio?.error"
        />
      </el-col>
      <el-col :span="12">
        <el-card class="disk-card">
          <template #header>
            <span>磁盘空间</span>
          </template>
          <div class="disk-content">
            <el-progress
              :percentage="healthData.services?.disk?.usage || 0"
              :status="getDiskStatus()"
              :stroke-width="20"
            />
            <div class="disk-info">
              <span>可用空间: {{ healthData.services?.disk?.available || 'N/A' }}</span>
              <span>使用率: {{ healthData.services?.disk?.usage || 0 }}%</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div v-if="lastUpdateTime" class="last-update">
      最后更新: {{ formatDateTime(lastUpdateTime) }}
      <span v-if="autoRefresh" class="next-refresh">| 下次刷新: {{ countdown }}s</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, CircleCheck, WarningFilled, CircleClose } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { getHealth, type HealthCheckResponse } from '@/api/health';
import HealthStatusCard from '@/components/monitoring/HealthStatusCard.vue';

const loading = ref(false);
const autoRefresh = ref(true);
const countdown = ref(60);
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

let refreshTimer: number | null = null;
let countdownTimer: number | null = null;

const fetchData = async () => {
  loading.value = true;
  try {
    const data = await getHealth();
    healthData.value = data;
    lastUpdateTime.value = new Date().toISOString();
    resetCountdown();
  } catch (error) {
    ElMessage.error('获取健康状态失败');
  } finally {
    loading.value = false;
  }
};

const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
};

const startAutoRefresh = () => {
  refreshTimer = window.setInterval(() => {
    fetchData();
  }, 60000);

  countdownTimer = window.setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      countdown.value = 60;
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
  countdown.value = 60;
};

const getOverallIcon = () => {
  const iconMap = {
    healthy: CircleCheck,
    degraded: WarningFilled,
    unhealthy: CircleClose,
  };
  return iconMap[healthData.value.status] || CircleClose;
};

const formatStatus = (status: string) => {
  const map = { healthy: '健康', degraded: '降级', unhealthy: '不健康' };
  return map[status] || status;
};

const getDiskStatus = () => {
  const usage = healthData.value.services?.disk?.usage || 0;
  if (usage >= 90) return 'exception';
  if (usage >= 70) return 'warning';
  return undefined;
};

const formatDateTime = (time: string) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-';
};

onMounted(() => {
  fetchData();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.health-page {
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
  align-items: center;
}

.overall-status {
  margin-bottom: 20px;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-icon {
  flex-shrink: 0;
}

.status-icon.status-healthy {
  color: #67c23a;
}

.status-icon.status-degraded {
  color: #e6a23c;
}

.status-icon.status-unhealthy {
  color: #f56c6c;
}

.status-info {
  flex: 1;
}

.status-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin-bottom: 4px;
}

.status-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 4px;
}

.status-value.status-healthy {
  color: #67c23a;
}

.status-value.status-degraded {
  color: #e6a23c;
}

.status-value.status-unhealthy {
  color: #f56c6c;
}

.status-time {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.services-row {
  margin-bottom: 20px;
}

.disk-card {
  height: 100%;
}

.disk-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.disk-info {
  display: flex;
  justify-content: space-between;
  color: var(--el-text-color-regular);
  font-size: 14px;
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
