<template>
  <el-card class="health-status-card" :class="`status-${status}`">
    <div class="card-header">
      <div class="icon-wrapper">
        <el-icon :size="32">
          <component :is="iconComponent" />
        </el-icon>
      </div>
      <div class="header-info">
        <h3>{{ title }}</h3>
        <span class="status-badge" :class="`badge-${status}`">{{ statusText }}</span>
      </div>
    </div>

    <div class="card-content">
      <div v-if="latency !== undefined" class="metric-item">
        <span class="label">延迟</span>
        <span class="value">{{ latency }}ms</span>
      </div>
      <div v-for="(metric, key) in metrics" :key="key" class="metric-item">
        <span class="label">{{ key }}</span>
        <span class="value">{{ metric }}</span>
      </div>
      <div v-if="error" class="error-message">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ error }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Coin, Folder, Box, Monitor, WarningFilled } from '@element-plus/icons-vue';

interface Props {
  title: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  icon?: string;
  latency?: number;
  metrics?: Record<string, string | number>;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'database',
});

const iconComponent = computed(() => {
  const iconMap: Record<string, any> = {
    database: Monitor,
    redis: Coin,
    minio: Folder,
    disk: Box,
  };
  return iconMap[props.icon] || Monitor;
});

const statusText = computed(() => {
  const textMap = {
    healthy: '健康',
    degraded: '降级',
    unhealthy: '不健康',
  };
  return textMap[props.status];
});
</script>

<style scoped>
.health-status-card {
  transition: all 0.3s;
}

.health-status-card.status-healthy {
  border-left: 4px solid #67c23a;
}

.health-status-card.status-degraded {
  border-left: 4px solid #e6a23c;
}

.health-status-card.status-unhealthy {
  border-left: 4px solid #f56c6c;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  background: var(--el-fill-color-light);
}

.status-healthy .icon-wrapper {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.status-degraded .icon-wrapper {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.status-unhealthy .icon-wrapper {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.header-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 4px;
}

.badge-healthy {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.badge-degraded {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.badge-unhealthy {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-item .label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.metric-item .value {
  font-weight: 500;
  font-size: 14px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f56c6c;
  font-size: 13px;
  padding: 8px;
  background: rgba(245, 108, 108, 0.1);
  border-radius: 4px;
}
</style>
