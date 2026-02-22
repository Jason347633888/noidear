<template>
  <div class="task-statistics">
    <el-card class="page-header">
      <h2>任务统计分析</h2>
      <p class="subtitle">按部门、模板、状态统计任务数据</p>
    </el-card>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="所属部门">
          <el-select v-model="filters.departmentId" clearable placeholder="全部" @change="fetchData">
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="任务模板">
          <el-select v-model="filters.templateId" clearable placeholder="全部" @change="fetchData">
            <el-option
              v-for="tpl in templates"
              :key="tpl.id"
              :label="tpl.title"
              :value="tpl.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="任务状态">
          <el-select v-model="filters.status" clearable placeholder="全部" @change="fetchData">
            <el-option label="待完成" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleDateChange"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
          <el-button @click="exportData">导出报表</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 关键指标 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <StatCard
          :icon="List"
          label="任务总数"
          :value="statisticsData.total || 0"
          icon-bg-color="#409eff"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="CircleCheck"
          label="完成率"
          :value="`${completionRate}%`"
          icon-bg-color="#67c23a"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="WarningFilled"
          label="逾期率"
          :value="`${overdueRate}%`"
          :icon-bg-color="overdueRate > 20 ? '#f56c6c' : '#e6a23c'"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="Timer"
          label="平均完成时间"
          :value="`${avgCompletionTime} 小时`"
          icon-bg-color="#909399"
        />
      </el-col>
    </el-row>

    <!-- 图表展示 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>按部门分布</span>
          </template>
          <div ref="deptChartRef" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <span>按模板分布</span>
          </template>
          <div ref="templateChartRef" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>按状态分布</span>
          </template>
          <div ref="statusChartRef" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <span>完成趋势</span>
          </template>
          <div ref="trendChartRef" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { List, CircleCheck, WarningFilled, Timer } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import request from '@/api/request';
import exportApi from '@/api/export';
import StatCard from '@/components/StatCard.vue';

const filters = ref({
  departmentId: undefined,
  templateId: undefined,
  status: undefined,
  startDate: undefined,
  endDate: undefined
});

const dateRange = ref<[string, string] | null>(null);
const departments = ref<any[]>([]);
const templates = ref<any[]>([]);
const statisticsData = ref<any>({});

const deptChartRef = ref<HTMLElement>();
const templateChartRef = ref<HTMLElement>();
const statusChartRef = ref<HTMLElement>();
const trendChartRef = ref<HTMLElement>();

let deptChart: echarts.ECharts | null = null;
let templateChart: echarts.ECharts | null = null;
let statusChart: echarts.ECharts | null = null;
let trendChart: echarts.ECharts | null = null;

const completionRate = computed(() => {
  const completed = statisticsData.value.byStatus?.find((s: any) => s.status === 'completed')?.count || 0;
  const total = statisticsData.value.total || 0;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

const overdueRate = computed(() => {
  return statisticsData.value.overdueRate || 0;
});

const avgCompletionTime = computed(() => {
  return statisticsData.value.avgCompletionTime || 0;
});

const handleDateChange = (value: any) => {
  if (value) {
    filters.value.startDate = value[0];
    filters.value.endDate = value[1];
  } else {
    filters.value.startDate = undefined;
    filters.value.endDate = undefined;
  }
  fetchData();
};

const fetchDepartments = async () => {
  try {
    const res = await request.get('/departments');
    departments.value = res.data || res.list || [];
  } catch (error: any) {
    ElMessage.error('获取部门列表失败');
  }
};

const fetchTemplates = async () => {
  try {
    const res = await request.get('/templates');
    templates.value = res.data || res.list || [];
  } catch (error: any) {
    ElMessage.error('获取模板列表失败');
  }
};

const fetchData = async () => {
  try {
    const params: any = {};
    if (filters.value.departmentId) params.departmentId = filters.value.departmentId;
    if (filters.value.templateId) params.templateId = filters.value.templateId;
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.startDate) params.startDate = filters.value.startDate;
    if (filters.value.endDate) params.endDate = filters.value.endDate;

    const res = await request.get('/statistics/tasks', { params });
    statisticsData.value = res.data || res;

    await nextTick();
    initCharts();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取任务统计数据失败');
  }
};

const resetFilters = () => {
  filters.value = {
    departmentId: undefined,
    templateId: undefined,
    status: undefined,
    startDate: undefined,
    endDate: undefined
  };
  dateRange.value = null;
  fetchData();
};

const exportData = async () => {
  try {
    const blob = await exportApi.exportStatistics('tasks');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `任务统计_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error(`导出失败: ${error.message || '未知错误'}`);
  }
};

const initCharts = () => {
  initDeptChart();
  initTemplateChart();
  initStatusChart();
  initTrendChart();
};

const initDeptChart = () => {
  if (!deptChartRef.value) return;
  if (!deptChart) deptChart = echarts.init(deptChartRef.value);

  const byDepartment = statisticsData.value.byDepartment || [];
  const data = byDepartment.map((d: any) => ({
    name: d.name || d.departmentName || `部门${d.departmentId}`,
    value: d.count
  }));

  deptChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: '任务数',
      type: 'pie',
      radius: '60%',
      data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  });
};

const initTemplateChart = () => {
  if (!templateChartRef.value) return;
  if (!templateChart) templateChart = echarts.init(templateChartRef.value);

  const byTemplate = statisticsData.value.byTemplate || [];
  const data = byTemplate.slice(0, 10);

  templateChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: data.map((t: any) => t.name || t.templateName || `模板${t.templateId}`)
    },
    series: [{
      name: '任务数',
      type: 'bar',
      data: data.map((t: any) => t.count),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#48c9b0' },
          { offset: 1, color: '#1abc9c' }
        ])
      }
    }]
  });
};

const initStatusChart = () => {
  if (!statusChartRef.value) return;
  if (!statusChart) statusChart = echarts.init(statusChartRef.value);

  const byStatus = statisticsData.value.byStatus || [];
  const statusMap: any = {
    pending: '待完成',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  };

  const data = byStatus.map((s: any) => ({
    value: s.count,
    name: statusMap[s.status] || s.status
  }));

  statusChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      name: '任务状态',
      type: 'pie',
      radius: ['40%', '70%'],
      data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  });
};

const initTrendChart = () => {
  if (!trendChartRef.value) return;
  if (!trendChart) trendChart = echarts.init(trendChartRef.value);

  const trends = statisticsData.value.trend || [];
  const dates = trends.map((t: any) => t.date || '');
  const completedData = trends.map((t: any) => t.completed || 0);
  const createdData = trends.map((t: any) => t.created || t.count || 0);

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['已完成', '新创建'] },
    xAxis: {
      type: 'category',
      data: dates.length > 0 ? dates : ['暂无数据']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '已完成',
        type: 'line',
        data: completedData.length > 0 ? completedData : [0],
        smooth: true,
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '新创建',
        type: 'line',
        data: createdData.length > 0 ? createdData : [0],
        smooth: true,
        itemStyle: { color: '#409eff' }
      }
    ]
  });
};

const resizeHandler = () => {
  deptChart?.resize();
  templateChart?.resize();
  statusChart?.resize();
  trendChart?.resize();
};

onMounted(() => {
  fetchDepartments();
  fetchTemplates();
  fetchData();
  window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler);
  deptChart?.dispose();
  templateChart?.dispose();
  statusChart?.dispose();
  trendChart?.dispose();
  deptChart = null;
  templateChart = null;
  statusChart = null;
  trendChart = null;
});
</script>

<style scoped>
.task-statistics {
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

.filter-card {
  margin-bottom: 20px;
}

.metrics-row {
  margin-bottom: 20px;
}

.chart-row {
  margin-bottom: 20px;
}
</style>
