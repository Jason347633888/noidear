<template>
  <div class="deviation-analytics">
    <PageHeaderBlock eyebrow="生产执行" title="偏差分析">
      <template #actions>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="handleDateChange"
        />
      </template>
    </PageHeaderBlock>

    <el-row :gutter="20">
      <!-- 偏离趋势图 -->
      <el-col :span="24" class="chart-section">
        <div class="app-panel">
          <div class="app-panel-header">
            <h3 class="app-panel-header__title">偏离趋势</h3>
            <div class="app-panel-header__actions">
              <el-radio-group v-model="granularity" @change="fetchTrendData">
                <el-radio-button label="day">按天</el-radio-button>
                <el-radio-button label="week">按周</el-radio-button>
                <el-radio-button label="month">按月</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div class="app-panel--padded">
            <div ref="trendChartRef" class="chart-container"></div>
          </div>
        </div>
      </el-col>

      <!-- 偏离字段分布 -->
      <el-col :span="12" class="chart-section">
        <div class="app-panel">
          <div class="app-panel-header">
            <h3 class="app-panel-header__title">偏离字段分布</h3>
          </div>
          <div class="app-panel--padded">
            <div ref="fieldChartRef" class="chart-container"></div>
          </div>
        </div>
      </el-col>

      <!-- 偏离原因词云 -->
      <el-col :span="12" class="chart-section">
        <div class="app-panel">
          <div class="app-panel-header">
            <h3 class="app-panel-header__title">偏离原因词云</h3>
          </div>
          <div class="app-panel--padded">
            <div ref="wordcloudChartRef" class="chart-container"></div>
          </div>
        </div>
      </el-col>

    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import 'echarts-wordcloud';
import dayjs from 'dayjs';
import deviationAnalyticsApi from '@/api/deviation-analytics';

const dateRange = ref<[string, string]>([
  dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD'),
]);

const granularity = ref<'day' | 'week' | 'month'>('day');

const trendChartRef = ref<HTMLDivElement | null>(null);
const fieldChartRef = ref<HTMLDivElement | null>(null);
const wordcloudChartRef = ref<HTMLDivElement | null>(null);

let trendChartInstance: echarts.ECharts | null = null;
let fieldChartInstance: echarts.ECharts | null = null;
let wordcloudChartInstance: echarts.ECharts | null = null;

onMounted(() => {
  initCharts();
  fetchAllData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  destroyCharts();
  window.removeEventListener('resize', handleResize);
});

const initCharts = () => {
  if (trendChartRef.value) trendChartInstance = echarts.init(trendChartRef.value);
  if (fieldChartRef.value) fieldChartInstance = echarts.init(fieldChartRef.value);
  if (wordcloudChartRef.value) wordcloudChartInstance = echarts.init(wordcloudChartRef.value);
};

const destroyCharts = () => {
  trendChartInstance?.dispose();
  fieldChartInstance?.dispose();
  wordcloudChartInstance?.dispose();
};

const handleResize = () => {
  trendChartInstance?.resize();
  fieldChartInstance?.resize();
  wordcloudChartInstance?.resize();
};

const handleDateChange = () => {
  fetchAllData();
};

const fetchAllData = async () => {
  await Promise.all([
    fetchTrendData(),
    fetchFieldDistribution(),
    fetchWordCloudData(),
  ]);
};

const fetchTrendData = async () => {
  if (!dateRange.value || dateRange.value.length !== 2) return;
  const [startDate, endDate] = dateRange.value;
  const res = await deviationAnalyticsApi.getTrend({ startDate, endDate, granularity: granularity.value });
  if (res.success && trendChartInstance) {
    const dates = res.data.map((item) => item.date);
    const counts = res.data.map((item) => item.count);
    const rates = res.data.map((item) => item.rate);
    trendChartInstance.setOption({
      title: { text: '偏离趋势分析', left: 'center' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['偏离数量', '偏离率'], top: 30 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45 } },
      yAxis: [
        { type: 'value', name: '偏离数量', position: 'left' },
        { type: 'value', name: '偏离率 (%)', position: 'right', max: 100 },
      ],
      series: [
        { name: '偏离数量', type: 'bar', data: counts, itemStyle: { color: '#409EFF' } },
        { name: '偏离率', type: 'line', yAxisIndex: 1, data: rates, smooth: true, itemStyle: { color: '#F56C6C' } },
      ],
    });
  }
};

const fetchFieldDistribution = async () => {
  const params = dateRange.value && dateRange.value.length === 2
    ? { startDate: dateRange.value[0], endDate: dateRange.value[1] }
    : undefined;
  const res = await deviationAnalyticsApi.getFieldDistribution(params);
  if (res.success && fieldChartInstance) {
    const data = res.data.map((item) => ({ name: item.fieldName, value: item.count }));
    fieldChartInstance.setOption({
      title: { text: '偏离字段分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', top: 30 },
      series: [{
        name: '偏离字段', type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
        labelLine: { show: false }, data,
      }],
    });
  }
};

const fetchWordCloudData = async () => {
  const res = await deviationAnalyticsApi.getReasonWordCloud();
  if (res.success && wordcloudChartInstance) {
    wordcloudChartInstance.setOption({
      title: { text: '偏离原因词云', left: 'center' },
      tooltip: { show: true, formatter: (params: any) => `${params.name}: ${params.value}` },
      series: [{
        type: 'wordCloud', shape: 'circle', left: 'center', top: 'center',
        width: '100%', height: '100%', right: null, bottom: null,
        sizeRange: [12, 60], rotationRange: [-90, 90], rotationStep: 45,
        gridSize: 8, drawOutOfBound: false, layoutAnimation: true,
        textStyle: {
          fontFamily: 'sans-serif', fontWeight: 'bold',
          color() {
            const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'];
            return colors[Math.floor(Math.random() * colors.length)];
          },
        },
        emphasis: { focus: 'self', textStyle: { textShadowBlur: 10, textShadowColor: '#333' } },
        data: res.data,
      }],
    });
  }
};

</script>

<style scoped lang="scss">
.deviation-analytics {
  padding: 20px;

  .chart-section {
    margin-bottom: 20px;
  }

  .chart-container {
    width: 100%;
    height: 400px;
  }
}
</style>
