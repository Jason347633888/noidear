<!--
  StatCard - 可复用统计卡片组件

  使用场景:
  1. 设备统计 (EquipmentStats.vue) - 设备总数、启用设备、停用设备、报废设备
  2. 报修统计 (FaultStats.vue) - 总报修数、平均响应时间、完成率
  3. 培训统计 (StatisticsPage.vue) - 培训项目总数、进行中项目、已完成项目、总参训人次

  设计规范:
  - 使用Element Plus Card组件
  - 图标 + 数值 + 标签的标准布局
  - 支持自定义图标颜色和主题
-->
<template>
  <el-card class="stat-card" :body-style="{ padding: '20px' }">
    <div class="stat-content">
      <div class="stat-icon" :style="{ backgroundColor: iconBgColor }">
        <el-icon :size="32" :color="iconColor">
          <component :is="icon" />
        </el-icon>
      </div>
      <div class="stat-info">
        <div class="stat-value">{{ formattedValue }}</div>
        <div class="stat-label">{{ label }}</div>
        <div v-if="trend !== undefined" class="stat-trend" :class="trendClass">
          <el-icon :size="14">
            <component :is="trendIcon" />
          </el-icon>
          <span>{{ trendText }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ArrowUp, ArrowDown, Minus } from '@element-plus/icons-vue';
import type { Component } from 'vue';

interface StatCardProps {
  /** 图标组件（来自@element-plus/icons-vue） */
  icon: Component;
  /** 图标颜色，默认'#ffffff' */
  iconColor?: string;
  /** 图标背景颜色，默认'#409eff' */
  iconBgColor?: string;
  /** 统计数值 */
  value: number | string;
  /** 统计标签 */
  label: string;
  /** 趋势值（可选，正数表示上升，负数表示下降，0表示持平） */
  trend?: number;
  /** 趋势文本（可选，如'+12%', '-5%'） */
  trendText?: string;
  /** 数值格式化函数（可选） */
  formatter?: (value: number | string) => string;
}

const props = withDefaults(defineProps<StatCardProps>(), {
  iconColor: '#ffffff',
  iconBgColor: '#409eff',
  trend: undefined,
  trendText: '',
  formatter: undefined,
});

const formattedValue = computed(() => {
  if (props.formatter) {
    return props.formatter(props.value);
  }
  return props.value;
});

const trendIcon = computed(() => {
  if (props.trend === undefined) return Minus;
  if (props.trend > 0) return ArrowUp;
  if (props.trend < 0) return ArrowDown;
  return Minus;
});

const trendClass = computed(() => {
  if (props.trend === undefined) return '';
  if (props.trend > 0) return 'trend-up';
  if (props.trend < 0) return 'trend-down';
  return 'trend-neutral';
});
</script>

<style scoped>
.stat-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
  transition: all 0.3s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
  line-height: 1.4;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-top: 4px;
}

.trend-up {
  color: #67c23a;
}

.trend-down {
  color: #f56c6c;
}

.trend-neutral {
  color: #909399;
}
</style>
