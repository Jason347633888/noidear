<template>
  <el-card class="alert-list">
    <template #header>
      <div class="header">
        <span>告警信息</span>
        <el-button text @click="$emit('refresh')">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </template>

    <el-empty v-if="alerts.length === 0" description="暂无告警" />

    <div v-else class="alert-items">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="alert-item"
        :class="`severity-${alert.severity}`"
      >
        <div class="alert-icon">
          <el-icon :size="20">
            <Warning v-if="alert.severity === 'critical'" />
            <WarningFilled v-else-if="alert.severity === 'warning'" />
            <InfoFilled v-else />
          </el-icon>
        </div>
        <div class="alert-content">
          <div class="alert-header">
            <span class="alert-name">{{ alert.ruleName || '告警规则' }}</span>
            <span class="alert-time">{{ formatTime(alert.triggeredAt) }}</span>
          </div>
          <div class="alert-message">{{ alert.message }}</div>
          <div class="alert-value">
            当前值: <strong>{{ alert.metricValue }}</strong>
          </div>
        </div>
        <div class="alert-actions">
          <el-button
            v-if="alert.status === 'triggered'"
            size="small"
            @click="$emit('acknowledge', alert.id)"
          >
            确认
          </el-button>
          <el-tag v-else size="small" type="info">已确认</el-tag>
        </div>
      </div>
    </div>

    <div v-if="showMore && alerts.length > 0" class="show-more">
      <el-button text @click="$emit('show-more')">查看全部告警</el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Refresh, Warning, WarningFilled, InfoFilled } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface Alert {
  id: string;
  ruleName?: string;
  severity: 'info' | 'warning' | 'critical';
  metricValue: number;
  triggeredAt: string;
  status: 'triggered' | 'resolved' | 'acknowledged';
  message: string;
}

interface Props {
  alerts: Alert[];
  showMore?: boolean;
}

withDefaults(defineProps<Props>(), {
  showMore: true,
});

defineEmits<{
  refresh: [];
  acknowledge: [id: string];
  'show-more': [];
}>();

const formatTime = (time: string) => {
  return dayjs(time).fromNow();
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid;
  background: var(--el-fill-color-light);
  transition: all 0.3s;
}

.alert-item:hover {
  background: var(--el-fill-color);
}

.severity-critical {
  border-left-color: #f56c6c;
}

.severity-critical .alert-icon {
  color: #f56c6c;
}

.severity-warning {
  border-left-color: #e6a23c;
}

.severity-warning .alert-icon {
  color: #e6a23c;
}

.severity-info {
  border-left-color: #409eff;
}

.severity-info .alert-icon {
  color: #409eff;
}

.alert-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-content {
  flex: 1;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.alert-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.alert-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.alert-message {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 4px;
}

.alert-value {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.alert-value strong {
  color: var(--el-text-color-primary);
}

.alert-actions {
  display: flex;
  align-items: center;
}

.show-more {
  text-align: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}
</style>
