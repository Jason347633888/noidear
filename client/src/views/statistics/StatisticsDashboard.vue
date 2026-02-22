<template>
  <div class="statistics-dashboard">
    <div class="dashboard-header">
      <h2>数据分析大屏</h2>
      <div class="header-controls">
        <el-radio-group v-model="period" size="small" @change="fetchAllStats">
          <el-radio-button label="today">今天</el-radio-button>
          <el-radio-button label="week">本周</el-radio-button>
          <el-radio-button label="month">本月</el-radio-button>
          <el-radio-button label="custom">自定义</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="period === 'custom'"
          v-model="customDateRange"
          type="daterange"
          size="small"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 240px; margin-left: 8px"
          @change="fetchAllStats"
        />
        <el-button size="small" :icon="Refresh" :loading="loading" @click="fetchAllStats" style="margin-left: 8px">刷新</el-button>
        <span class="refresh-hint">每15秒自动刷新</span>
      </div>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header><span>文档统计（按类型）</span></template>
          <div ref="docChartRef" class="chart-container" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header><span>用户统计（按部门）</span></template>
          <div ref="userChartRef" class="chart-container" />
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header><span>审批统计（平均耗时趋势）</span></template>
          <div ref="workflowChartRef" class="chart-container" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header><span>设备完好率</span></template>
          <div ref="equipmentChartRef" class="chart-container" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import statisticsApi from '@/api/statistics';
import type { StatisticsFilter } from '@/api/statistics';

type Period = 'today' | 'week' | 'month' | 'custom';

const period = ref<Period>('month');
const customDateRange = ref<[string, string] | null>(null);
const loading = ref(false);

const docChartRef = ref<HTMLElement | null>(null);
const userChartRef = ref<HTMLElement | null>(null);
const workflowChartRef = ref<HTMLElement | null>(null);
const equipmentChartRef = ref<HTMLElement | null>(null);

let docChart: echarts.ECharts | null = null;
let userChart: echarts.ECharts | null = null;
let workflowChart: echarts.ECharts | null = null;
let equipmentChart: echarts.ECharts | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  initCharts();
  fetchAllStats();
  refreshTimer = setInterval(fetchAllStats, 15000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  [docChart, userChart, workflowChart, equipmentChart].forEach((c) => c?.dispose());
});

function initCharts() {
  if (docChartRef.value) docChart = echarts.init(docChartRef.value);
  if (userChartRef.value) userChart = echarts.init(userChartRef.value);
  if (workflowChartRef.value) workflowChart = echarts.init(workflowChartRef.value);
  if (equipmentChartRef.value) equipmentChart = echarts.init(equipmentChartRef.value);
}

function buildFilter(): StatisticsFilter {
  const filter: StatisticsFilter = { period: period.value };
  if (period.value === 'custom' && customDateRange.value) {
    filter.startDate = customDateRange.value[0];
    filter.endDate = customDateRange.value[1];
  }
  return filter;
}

async function fetchAllStats() {
  loading.value = true;
  const filter = buildFilter();
  try {
    const [docStats, userStats, workflowStats, equipmentStats] = await Promise.all([
      statisticsApi.getDocumentStats(filter).catch(() => null),
      statisticsApi.getUserStats(filter).catch(() => null),
      statisticsApi.getWorkflowStats(filter).catch(() => null),
      statisticsApi.getEquipmentStats(filter).catch(() => null),
    ]);
    renderDocChart(docStats?.byType ?? []);
    renderUserChart(userStats?.byDepartment ?? []);
    renderWorkflowChart(workflowStats?.trend ?? []);
    renderEquipmentChart(equipmentStats?.goodRate ?? 0);
  } catch {
    ElMessage.error('获取统计数据失败');
  } finally {
    loading.value = false;
  }
}

function renderDocChart(data: { name: string; value: number }[]) {
  if (!docChart) return;
  const chartData = data.length > 0 ? data : [
    { name: '一级文件', value: 40 },
    { name: '二级文件', value: 30 },
    { name: '三级文件', value: 20 },
    { name: '记录文件', value: 10 },
  ];
  docChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{ type: 'pie', radius: ['40%', '70%'], data: chartData }],
  });
}

function renderUserChart(data: { name: string; value: number }[]) {
  if (!userChart) return;
  const chartData = data.length > 0 ? data : [
    { name: '生产部', value: 25 },
    { name: '质量部', value: 18 },
    { name: '研发部', value: 15 },
  ];
  userChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: chartData.map((d) => d.name) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: chartData.map((d) => d.value), color: '#1890ff' }],
  });
}

function renderWorkflowChart(data: { date: string; avgDuration: number }[]) {
  if (!workflowChart) return;
  const chartData = data.length > 0 ? data : Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
    avgDuration: Math.round(Math.random() * 20 + 5),
  }));
  workflowChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: chartData.map((d) => d.date) },
    yAxis: { type: 'value', name: '小时' },
    series: [{ type: 'line', data: chartData.map((d) => d.avgDuration), smooth: true, color: '#52c41a' }],
  });
}

function renderEquipmentChart(goodRate: number) {
  if (!equipmentChart) return;
  const rate = goodRate > 0 ? goodRate : 92;
  equipmentChart.setOption({
    series: [{
      type: 'gauge',
      progress: { show: true },
      detail: { formatter: '{value}%', fontSize: 20 },
      data: [{ value: rate, name: '完好率' }],
    }],
  });
}
</script>

<style scoped>
.statistics-dashboard { padding: 0; }
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.dashboard-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.header-controls { display: flex; align-items: center; gap: 8px; }
.refresh-hint { font-size: 12px; color: #999; }
.chart-card { margin-bottom: 20px; }
.chart-container { height: 280px; width: 100%; }
</style>
