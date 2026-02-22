<template>
  <div class="statistics-overview">
    <el-card class="page-header">
      <h2>统计概览</h2>
      <p class="subtitle">查看系统关键指标和运营数据</p>
    </el-card>

    <!-- 关键指标卡片 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon document">
            <el-icon><Document /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ overviewData.totals?.documents || 0 }}</div>
            <div class="metric-label">文档总数</div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon task">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ overviewData.totals?.tasks || 0 }}</div>
            <div class="metric-label">任务总数</div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon approval">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ overviewData.totals?.approvals || 0 }}</div>
            <div class="metric-label">审批总数</div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon template">
            <el-icon><Document /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ overviewData.monthly?.documents || 0 }}</div>
            <div class="metric-label">本月新增文档</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 关键指标详情 -->
    <el-row :gutter="20" class="details-row">
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>任务完成情况</span>
          </template>
          <div class="detail-item">
            <span>完成率</span>
            <span class="detail-value">{{ taskCompletionRate }}%</span>
          </div>
          <div class="detail-item">
            <span>本月新增任务</span>
            <span class="detail-value">{{ overviewData.monthly?.tasks || 0 }}</span>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header>
            <span>审批效率</span>
          </template>
          <div class="detail-item">
            <span>审批通过率</span>
            <span class="detail-value success">{{ approvalRate }}%</span>
          </div>
          <div class="detail-item">
            <span>本月新增审批</span>
            <span class="detail-value">{{ overviewData.monthly?.approvals || 0 }}</span>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header>
            <span>本月新增</span>
          </template>
          <div class="detail-item" v-for="item in monthlyItems" :key="item.label">
            <span>{{ item.label }}</span>
            <span class="detail-value">{{ item.count }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图表 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="chart-header">
              <span>数据趋势</span>
              <el-select v-model="timeRange" @change="fetchData" style="width: 150px">
                <el-option label="本月" value="month" />
                <el-option label="本季度" value="quarter" />
                <el-option label="本年" value="year" />
              </el-select>
            </div>
          </template>
          <div ref="chartRef" style="width: 100%; height: 400px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Document, Calendar, CircleCheck } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import request from '@/api/request';

const overviewData = ref<any>({});
const timeRange = ref('month');
const chartRef = ref<HTMLElement>();
let chartInstance: echarts.ECharts | null = null;

const taskCompletionRate = computed(() => {
  return overviewData.value.metrics?.taskCompletionRate || 0;
});

const approvalRate = computed(() => {
  return overviewData.value.metrics?.approvalPassRate || 0;
});

const monthlyItems = computed(() => {
  return [
    { label: '文档', count: overviewData.value.monthly?.documents || 0 },
    { label: '任务', count: overviewData.value.monthly?.tasks || 0 },
    { label: '审批', count: overviewData.value.monthly?.approvals || 0 },
  ];
});

const getDateRange = (range: string): { startDate: string; endDate: string } => {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const start = new Date(now);

  if (range === 'month') {
    start.setDate(1);
  } else if (range === 'quarter') {
    start.setMonth(start.getMonth() - 3);
  } else if (range === 'year') {
    start.setMonth(0, 1);
  }

  return { startDate: start.toISOString().split('T')[0], endDate };
};

const fetchData = async () => {
  try {
    const params = getDateRange(timeRange.value);
    const res = await request.get('/statistics/overview', { params });
    overviewData.value = res.data || res;
    await nextTick();
    initChart();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取统计数据失败');
  }
};

const initChart = () => {
  if (!chartRef.value) return;

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const trends = overviewData.value.trends || {};
  const docTrend = trends.documents || [];
  const taskTrend = trends.tasks || [];
  const approvalTrend = trends.approvals || [];

  const dates = docTrend.length > 0
    ? docTrend.map((t: any) => t.date || '')
    : ['暂无数据'];

  const option = {
    title: { text: '关键指标趋势' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['文档数', '任务数', '审批数'] },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '文档数',
        type: 'line',
        data: docTrend.length > 0 ? docTrend.map((t: any) => t.count || 0) : [overviewData.value.totals?.documents || 0],
        smooth: true
      },
      {
        name: '任务数',
        type: 'line',
        data: taskTrend.length > 0 ? taskTrend.map((t: any) => t.count || 0) : [overviewData.value.totals?.tasks || 0],
        smooth: true
      },
      {
        name: '审批数',
        type: 'line',
        data: approvalTrend.length > 0 ? approvalTrend.map((t: any) => t.count || 0) : [overviewData.value.totals?.approvals || 0],
        smooth: true
      }
    ]
  };

  chartInstance.setOption(option);
};

const resizeHandler = () => {
  chartInstance?.resize();
};

onMounted(() => {
  fetchData();
  window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.statistics-overview {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.subtitle {
  margin: 8px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  display: flex;
  align-items: center;
  padding: 20px;
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
}

.metric-icon.document {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.metric-icon.task {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.metric-icon.approval {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.metric-icon.template {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

.details-row {
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-value {
  font-weight: bold;
  color: #606266;
}

.detail-value.success {
  color: #67c23a;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-row {
  margin-bottom: 20px;
}
</style>
