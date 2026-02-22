<template>
  <el-card class="metric-card">
    <div class="metric-icon" :class="`icon-${color}`">
      <el-icon :size="28">
        <component :is="iconComponent" />
      </el-icon>
    </div>
    <div class="metric-info">
      <div class="metric-value">{{ displayValue }}</div>
      <div class="metric-label">{{ label }}</div>
      <div v-if="trend !== undefined" class="metric-trend">
        <el-icon :class="trendClass">
          <component :is="trendIcon" />
        </el-icon>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Document, Calendar, CircleCheck, User, TrendCharts, ArrowUp, ArrowDown } from '@element-plus/icons-vue';

interface Props {
  label: string;
  value: number | string;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'info';
  trend?: number;
  formatter?: (value: number | string) => string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'document',
  color: 'primary',
});

const iconComponent = computed(() => {
  const iconMap: Record<string, any> = {
    document: Document,
    calendar: Calendar,
    check: CircleCheck,
    user: User,
    chart: TrendCharts,
  };
  return iconMap[props.icon] || Document;
});

const displayValue = computed(() => {
  if (props.formatter) {
    return props.formatter(props.value);
  }
  return props.value;
});

const trendIcon = computed(() => {
  if (props.trend === undefined) return null;
  return props.trend >= 0 ? ArrowUp : ArrowDown;
});

const trendClass = computed(() => {
  if (props.trend === undefined) return '';
  return props.trend >= 0 ? 'trend-up' : 'trend-down';
});
</script>

<style scoped>
.metric-card {
  display: flex;
  align-items: center;
  padding: 20px;
  transition: all 0.3s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.icon-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.icon-success {
  background: linear-gradient(135deg, #67c23a 0%, #4caf50 100%);
  color: #fff;
}

.icon-warning {
  background: linear-gradient(135deg, #e6a23c 0%, #f39c12 100%);
  color: #fff;
}

.icon-info {
  background: linear-gradient(135deg, #409eff 0%, #2196f3 100%);
  color: #fff;
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.metric-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin-top: 4px;
}

.metric-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
}

.trend-up {
  color: #67c23a;
}

.trend-down {
  color: #f56c6c;
}
</style>
