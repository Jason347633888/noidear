<template>
  <div class="training-statistics">
    <el-card class="page-header">
      <h2>培训统计分析</h2>
      <p class="subtitle">培训项目与学员数据统计分析</p>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :xs="24" :sm="12" :md="6">
        <StatCard
          :icon="Calendar"
          label="培训项目总数"
          :value="statistics.totalProjects || 0"
          icon-bg-color="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <StatCard
          :icon="Clock"
          label="进行中项目"
          :value="statistics.ongoingProjects || 0"
          icon-bg-color="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        />
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <StatCard
          :icon="CircleCheck"
          label="已完成项目"
          :value="statistics.completedProjects || 0"
          icon-bg-color="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
      </el-col>

      <el-col :xs="24" :sm="12" :md="6">
        <StatCard
          :icon="User"
          label="总参训人次"
          :value="statistics.totalTrainees || 0"
          icon-bg-color="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-row">
      <!-- 项目状态分布 -->
      <el-col :xs="24" :md="12">
        <el-card>
          <template #header>
            <span>项目状态分布</span>
          </template>
          <div ref="statusChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>

      <!-- 学员通过率趋势 -->
      <el-col :xs="24" :md="12">
        <el-card>
          <template #header>
            <span>学员通过率趋势</span>
          </template>
          <div ref="passRateChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>

      <!-- 部门参训统计 -->
      <el-col :xs="24" :md="12">
        <el-card>
          <template #header>
            <span>部门参训统计</span>
          </template>
          <div ref="deptChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>

      <!-- 季度计划完成率 -->
      <el-col :xs="24" :md="12">
        <el-card>
          <template #header>
            <span>季度计划完成率</span>
          </template>
          <div ref="quarterChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>

      <!-- 考试平均分趋势 -->
      <el-col :xs="24">
        <el-card>
          <template #header>
            <span>考试平均分趋势</span>
          </template>
          <div ref="scoreChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作按钮 -->
    <el-row :gutter="20" class="action-row">
      <el-col :span="24">
        <el-card>
          <el-button type="primary" @click="exportData" :loading="exporting">
            <el-icon><Download /></el-icon>
            导出统计数据（Excel）
          </el-button>
          <el-button @click="refreshData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Calendar, Clock, CircleCheck, User, Download, Refresh } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { getTrainingProjects, getTrainingPlans, getLearningRecords } from '@/api/training';
import * as XLSX from 'xlsx';
import StatCard from '@/components/StatCard.vue';

const loading = ref(false);
const exporting = ref(false);

// 统计数据
const statistics = ref<any>({
  totalProjects: 0,
  ongoingProjects: 0,
  completedProjects: 0,
  totalTrainees: 0,
  averagePassRate: 0,
});

// Chart refs
const statusChartRef = ref<HTMLElement>();
const passRateChartRef = ref<HTMLElement>();
const deptChartRef = ref<HTMLElement>();
const quarterChartRef = ref<HTMLElement>();
const scoreChartRef = ref<HTMLElement>();

let statusChart: echarts.ECharts | null = null;
let passRateChart: echarts.ECharts | null = null;
let deptChart: echarts.ECharts | null = null;
let quarterChart: echarts.ECharts | null = null;
let scoreChart: echarts.ECharts | null = null;

// 获取统计数据
const fetchStatistics = async () => {
  loading.value = true;
  try {
    // 获取项目数据
    const projectsRes = await getTrainingProjects({ limit: 1000 });
    const projects = projectsRes.items || [];

    // 获取学习记录
    const records = await getLearningRecords({ limit: 1000 });

    // 计算统计
    statistics.value.totalProjects = projects.length;
    statistics.value.ongoingProjects = projects.filter((p: any) => p.status === 'ongoing').length;
    statistics.value.completedProjects = projects.filter((p: any) => p.status === 'completed').length;
    statistics.value.totalTrainees = records.length;

    // 计算通过率
    const passedRecords = records.filter((r: any) => r.status === 'passed');
    statistics.value.averagePassRate = records.length > 0 
      ? Math.round((passedRecords.length / records.length) * 100) 
      : 0;

    await nextTick();
    initCharts(projects, records);
  } catch (error: any) {
    ElMessage.error(error.message || '获取统计数据失败');
  } finally {
    loading.value = false;
  }
};

// 初始化图表
const initCharts = (projects: any[], records: any[]) => {
  initStatusChart(projects);
  initPassRateChart(records);
  initDeptChart(projects);
  initQuarterChart(projects);
  initScoreChart(records);
};

// 1. 项目状态分布（饼图）
const initStatusChart = (projects: any[]) => {
  if (!statusChartRef.value) return;
  if (!statusChart) {
    statusChart = echarts.init(statusChartRef.value);
  }

  const statusCount = {
    planned: projects.filter(p => p.status === 'planned').length,
    ongoing: projects.filter(p => p.status === 'ongoing').length,
    completed: projects.filter(p => p.status === 'completed').length,
    cancelled: projects.filter(p => p.status === 'cancelled').length,
  };

  const option = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie',
      radius: '50%',
      data: [
        { value: statusCount.planned, name: '计划中' },
        { value: statusCount.ongoing, name: '进行中' },
        { value: statusCount.completed, name: '已完成' },
        { value: statusCount.cancelled, name: '已取消' },
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  statusChart.setOption(option);
};

// 2. 学员通过率趋势（折线图）
const initPassRateChart = (records: any[]) => {
  if (!passRateChartRef.value) return;
  if (!passRateChart) {
    passRateChart = echarts.init(passRateChartRef.value);
  }

  // 按月统计通过率
  const monthlyData = records.reduce((acc: any, record: any) => {
    const month = record.createdAt ? record.createdAt.substring(0, 7) : '未知';
    if (!acc[month]) {
      acc[month] = { total: 0, passed: 0 };
    }
    acc[month].total++;
    if (record.status === 'passed') {
      acc[month].passed++;
    }
    return acc;
  }, {});

  const months = Object.keys(monthlyData).sort();
  const passRates = months.map(month => {
    const data = monthlyData[month];
    return data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
  });

  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: months,
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' },
    },
    series: [{
      data: passRates,
      type: 'line',
      smooth: true,
      areaStyle: {},
    }]
  };

  passRateChart.setOption(option);
};

// 3. 部门参训统计（柱状图）
const initDeptChart = (projects: any[]) => {
  if (!deptChartRef.value) return;
  if (!deptChart) {
    deptChart = echarts.init(deptChartRef.value);
  }

  const deptCount = projects.reduce((acc: any, project: any) => {
    const dept = project.department || '未分配';
    acc[dept] = (acc[dept] || 0) + (project.traineeCount || project.trainees?.length || 0);
    return acc;
  }, {});

  const depts = Object.keys(deptCount);
  const counts = depts.map(dept => deptCount[dept]);

  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: depts,
    },
    yAxis: {
      type: 'value',
    },
    series: [{
      data: counts,
      type: 'bar',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 1, color: '#188df0' }
        ])
      }
    }]
  };

  deptChart.setOption(option);
};

// 4. 季度计划完成率（柱状图）
const initQuarterChart = (projects: any[]) => {
  if (!quarterChartRef.value) return;
  if (!quarterChart) {
    quarterChart = echarts.init(quarterChartRef.value);
  }

  const quarterData = projects.reduce((acc: any, project: any) => {
    const q = project.quarter || 1;
    if (!acc[q]) {
      acc[q] = { total: 0, completed: 0 };
    }
    acc[q].total++;
    if (project.status === 'completed') {
      acc[q].completed++;
    }
    return acc;
  }, {});

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const completionRates = quarters.map((_, index) => {
    const q = index + 1;
    const data = quarterData[q] || { total: 0, completed: 0 };
    return data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
  });

  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: quarters,
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' },
    },
    series: [{
      data: completionRates,
      type: 'bar',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#2af598' },
          { offset: 1, color: '#009efd' }
        ])
      }
    }]
  };

  quarterChart.setOption(option);
};

// 5. 考试平均分趋势（折线图）
const initScoreChart = (records: any[]) => {
  if (!scoreChartRef.value) return;
  if (!scoreChart) {
    scoreChart = echarts.init(scoreChartRef.value);
  }

  // 按月统计平均分
  const monthlyScores = records.reduce((acc: any, record: any) => {
    if (!record.examRecords || record.examRecords.length === 0) return acc;
    
    const month = record.createdAt ? record.createdAt.substring(0, 7) : '未知';
    if (!acc[month]) {
      acc[month] = { total: 0, count: 0 };
    }
    
    const avgScore = record.examRecords.reduce((sum: number, exam: any) => sum + (exam.score || 0), 0) / record.examRecords.length;
    acc[month].total += avgScore;
    acc[month].count++;
    
    return acc;
  }, {});

  const months = Object.keys(monthlyScores).sort();
  const avgScores = months.map(month => {
    const data = monthlyScores[month];
    return data.count > 0 ? Math.round(data.total / data.count) : 0;
  });

  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: months,
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}分' },
    },
    series: [{
      data: avgScores,
      type: 'line',
      smooth: true,
      itemStyle: { color: '#5470c6' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
          { offset: 1, color: 'rgba(84, 112, 198, 0.1)' }
        ])
      }
    }]
  };

  scoreChart.setOption(option);
};

// 导出数据
const exportData = async () => {
  exporting.value = true;
  try {
    const projectsRes = await getTrainingProjects({ limit: 1000 });
    const projects = projectsRes.items || [];

    const exportData = projects.map((p: any) => ({
      '项目标题': p.title,
      '部门': p.department,
      '季度': `Q${p.quarter}`,
      '状态': p.status === 'planned' ? '计划中' : p.status === 'ongoing' ? '进行中' : p.status === 'completed' ? '已完成' : '已取消',
      '学员数': p.traineeCount || p.trainees?.length || 0,
      '讲师': p.trainer?.name || '',
      '计划日期': p.scheduledDate || '',
      '创建时间': p.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '培训统计');

    XLSX.writeFile(wb, `培训统计_${new Date().toISOString().split('T')[0]}.xlsx`);
    ElMessage.success('导出成功');
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败');
  } finally {
    exporting.value = false;
  }
};

// 刷新数据
const refreshData = () => {
  fetchStatistics();
};

// 响应式处理
const handleResize = () => {
  statusChart?.resize();
  passRateChart?.resize();
  deptChart?.resize();
  quarterChart?.resize();
  scoreChart?.resize();
};

onMounted(() => {
  fetchStatistics();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  statusChart?.dispose();
  passRateChart?.dispose();
  deptChart?.dispose();
  quarterChart?.dispose();
  scoreChart?.dispose();
});
</script>

<style scoped>
.training-statistics {
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

.charts-row {
  margin-bottom: 20px;
}

.action-row {
  margin-bottom: 20px;
}
</style>
