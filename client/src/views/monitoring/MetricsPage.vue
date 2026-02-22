<template>
  <div class="metrics-page">
    <el-card class="page-header">
      <div class="header-content">
        <div>
          <h2>性能指标监控</h2>
          <p class="subtitle">查看系统、应用和业务指标趋势</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
        </div>
      </div>
    </el-card>

    <el-card class="filter-card">
      <el-form :model="filterForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="指标类型">
              <el-select v-model="filterForm.metricType" placeholder="请选择指标类型" @change="handleMetricTypeChange">
                <el-option label="系统指标" value="system" />
                <el-option label="应用指标" value="application" />
                <el-option label="业务指标" value="business" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="指标名称">
              <el-select v-model="filterForm.metricName" multiple placeholder="请选择指标" clearable>
                <el-option
                  v-for="metric in availableMetrics"
                  :key="metric.name"
                  :label="metric.description"
                  :value="metric.name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="时间范围">
              <el-select v-model="filterForm.timeRange" @change="fetchData">
                <el-option label="最近1小时" value="1h" />
                <el-option label="最近6小时" value="6h" />
                <el-option label="最近24小时" value="24h" />
                <el-option label="最近7天" value="7d" />
                <el-option label="最近30天" value="30d" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="fetchData">查询</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-row :gutter="20" v-if="chartData.length > 0">
      <el-col :span="24" v-for="(chart, index) in chartData" :key="index">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>{{ chart.title }}</span>
              <el-button text :icon="Download" @click="exportChart(chart.id)">导出</el-button>
            </div>
          </template>
          <div :id="chart.id" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-else description="暂无数据，请选择指标进行查询" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Search, Download } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { queryMetrics, getAvailableMetrics, type SystemMetric } from '@/api/monitoring';

const AREA_GRADIENT = {
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
    { offset: 1, color: 'rgba(64, 158, 255, 0)' },
  ],
};

const TIME_RANGE_MAP: Record<string, number> = {
  '1h': 1,
  '6h': 6,
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

const loading = ref(false);
const filterForm = reactive({
  metricType: 'system' as 'system' | 'application' | 'business',
  metricName: [] as string[],
  timeRange: '24h',
});

const availableMetrics = ref<Array<{ name: string; type: string; description: string }>>([]);
const chartData = ref<Array<{ id: string; title: string; data: SystemMetric[] }>>([]);
const chartInstances = new Map<string, echarts.ECharts>();

const fetchAvailableMetrics = async () => {
  try {
    const metrics = await getAvailableMetrics();
    availableMetrics.value = metrics || [];
  } catch (error) {
    ElMessage.error('获取指标列表失败');
  }
};

const handleMetricTypeChange = () => {
  filterForm.metricName = [];
  fetchData();
};

const fetchData = async () => {
  if (!filterForm.metricName || filterForm.metricName.length === 0) {
    chartData.value = [];
    return;
  }

  loading.value = true;
  try {
    const hours = TIME_RANGE_MAP[filterForm.timeRange];
    const startTime = dayjs().subtract(hours, 'hour').toISOString();
    const endTime = dayjs().toISOString();

    const promises = filterForm.metricName.map(async (metricName) => {
      const data = await queryMetrics({
        metricName,
        metricType: filterForm.metricType,
        startTime,
        endTime,
        aggregation: hours > 24 ? 'hour' : 'minute',
      });

      const metric = availableMetrics.value.find((m) => m.name === metricName);
      return {
        id: `chart-${metricName}`,
        title: metric?.description || metricName,
        data: data || [],
      };
    });

    chartData.value = await Promise.all(promises);
    await nextTick();
    renderCharts();
  } catch (error) {
    ElMessage.error('查询指标数据失败');
  } finally {
    loading.value = false;
  }
};

const createChartOption = (chart: { title: string; data: SystemMetric[] }) => {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'time', boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      {
        name: chart.title,
        type: 'line',
        smooth: true,
        areaStyle: { color: AREA_GRADIENT },
        data: chart.data.map((item) => [item.timestamp, item.metricValue]),
      },
    ],
  };
};

const renderCharts = () => {
  chartData.value.forEach((chart) => {
    try {
      const dom = document.getElementById(chart.id);
      if (!dom) {
        console.warn(`Chart container not found: ${chart.id}`);
        return;
      }

      let instance = chartInstances.get(chart.id);
      if (!instance) {
        instance = echarts.init(dom);
        chartInstances.set(chart.id, instance);
      }

      const option = createChartOption(chart);
      instance.setOption(option);
    } catch (error) {
      console.error(`Failed to render chart ${chart.id}:`, error);
    }
  });
};

const exportChart = (chartId: string) => {
  const instance = chartInstances.get(chartId);
  if (!instance) return;

  const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  const link = document.createElement('a');
  link.href = url;
  link.download = `${chartId}_${dayjs().format('YYYYMMDD_HHmmss')}.png`;
  link.click();
  ElMessage.success('导出成功');
};

const resizeCharts = () => {
  chartInstances.forEach((instance) => instance.resize());
};

onMounted(() => {
  fetchAvailableMetrics();
  window.addEventListener('resize', resizeCharts);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts);
  chartInstances.forEach((instance) => instance.dispose());
  chartInstances.clear();
});
</script>

<style scoped>
.metrics-page {
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

.filter-card {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 400px;
}
</style>
