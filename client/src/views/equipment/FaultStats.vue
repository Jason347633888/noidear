<template>
  <div class="fault-stats-page">
    <div class="page-header">
      <el-button @click="$router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <h1 class="page-title">报修统计</h1>
    </div>

    <!-- Date Range Filter -->
    <el-card class="filter-card">
      <div class="filter-bar">
        <span class="filter-label">统计时间:</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="fetchStats"
        />
        <el-button type="primary" @click="fetchStats">查询</el-button>
      </div>
    </el-card>

    <!-- Overview Cards -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="8">
        <el-card class="metric-card">
          <div class="metric-icon fault">
            <el-icon><WarnTriangleFilled /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ statsData.totalFaults }}</div>
            <div class="metric-label">总报修数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="metric-card">
          <div class="metric-icon time">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ formatResponseTime(statsData.avgResponseTime) }}</div>
            <div class="metric-label">平均响应时间</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="metric-card">
          <div class="metric-icon rate">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ statsData.completionRate }}%</div>
            <div class="metric-label">完成率</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Charts -->
    <el-row :gutter="20">
      <el-col :span="14">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">报修趋势（按月）</span>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">故障率排行（按设备）</span>
          </template>
          <div ref="rankChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, WarnTriangleFilled, Timer, CircleCheck } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import equipmentApi, { type FaultStatsData } from '@/api/equipment';

const dateRange = ref<[string, string] | null>(null);
const trendChartRef = ref<HTMLElement>();
const rankChartRef = ref<HTMLElement>();
let trendChart: echarts.ECharts | null = null;
let rankChart: echarts.ECharts | null = null;

const statsData = ref<FaultStatsData>({
  totalFaults: 0,
  avgResponseTime: 0,
  completionRate: 0,
  monthlyTrend: [],
  faultRateByEquipment: [],
});

const formatResponseTime = (minutes: number): string => {
  if (!minutes) return '0 分钟';
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  return `${Math.round(minutes / 60)} 小时`;
};

const fetchStats = async () => {
  try {
    const params = dateRange.value
      ? { startDate: dateRange.value[0], endDate: dateRange.value[1] }
      : undefined;
    const res = await equipmentApi.getFaultStats(params) as unknown as FaultStatsData;
    statsData.value = res;
    await nextTick();
    renderTrendChart();
    renderRankChart();
  } catch {
    ElMessage.error('获取报修统计数据失败');
  }
};

const renderTrendChart = () => {
  if (!trendChartRef.value) return;
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value);
  }
  const trend = statsData.value.monthlyTrend || [];
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.month),
    },
    yAxis: { type: 'value', name: '报修数' },
    series: [{
      name: '报修数',
      type: 'bar',
      data: trend.map((t) => t.count),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#f56c6c' },
          { offset: 1, color: '#f9a8a8' },
        ]),
        borderRadius: [4, 4, 0, 0],
      },
    }],
    grid: { top: 40, right: 20, bottom: 40, left: 60 },
  });
};

const renderRankChart = () => {
  if (!rankChartRef.value) return;
  if (!rankChart) {
    rankChart = echarts.init(rankChartRef.value);
  }
  const rank = (statsData.value.faultRateByEquipment || []).slice(0, 10);
  rankChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', name: '故障次数' },
    yAxis: {
      type: 'category',
      data: rank.map((r) => r.equipmentName).reverse(),
      axisLabel: {
        width: 100,
        overflow: 'truncate',
      },
    },
    series: [{
      name: '故障次数',
      type: 'bar',
      data: rank.map((r) => r.faultCount).reverse(),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#e6a23c' },
          { offset: 1, color: '#f56c6c' },
        ]),
        borderRadius: [0, 4, 4, 0],
      },
    }],
    grid: { top: 20, right: 20, bottom: 40, left: 120 },
  });
};

const handleResize = () => {
  trendChart?.resize();
  rankChart?.resize();
};

onMounted(() => {
  fetchStats();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
  rankChart?.dispose();
  trendChart = null;
  rankChart = null;
});
</script>

<style scoped>
.fault-stats-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  font-family: 'Inter', sans-serif;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn { border-radius: 8px; }

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0;
}

.filter-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
  margin-bottom: 20px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: 14px;
  color: var(--text-light);
  white-space: nowrap;
}

.metrics-row { margin-bottom: 20px; }

.metric-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.metric-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 24px;
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 28px;
  color: white;
  flex-shrink: 0;
}

.metric-icon.fault {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
}

.metric-icon.time {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
}

.metric-icon.rate {
  background: linear-gradient(135deg, #67c23a 0%, #95d475 100%);
}

.metric-info { flex: 1; }

.metric-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

.chart-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
  margin-bottom: 20px;
}

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
}

.chart-container {
  width: 100%;
  height: 350px;
}
</style>
