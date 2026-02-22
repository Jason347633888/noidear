<template>
  <div class="document-statistics">
    <el-card class="page-header">
      <h2>文档统计分析</h2>
      <p class="subtitle">按级别、部门、状态统计文档数据</p>
    </el-card>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="文档级别">
          <el-select v-model="filters.level" clearable placeholder="全部" @change="fetchData">
            <el-option label="一级文件" :value="1" />
            <el-option label="二级文件" :value="2" />
            <el-option label="三级文件" :value="3" />
          </el-select>
        </el-form-item>

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

        <el-form-item label="文档状态">
          <el-select v-model="filters.status" clearable placeholder="全部" @change="fetchData">
            <el-option label="草稿" value="draft" />
            <el-option label="审批中" value="pending" />
            <el-option label="已发布" value="approved" />
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

    <!-- 统计概要 -->
    <el-row :gutter="20" class="summary-row">
      <el-col :span="6">
        <StatCard
          :icon="Document"
          label="文档总数"
          :value="statisticsData.total || 0"
          icon-bg-color="#409eff"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="Plus"
          label="本月新增"
          :value="monthlyGrowth"
          icon-bg-color="#67c23a"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="TrendCharts"
          label="增长率"
          :value="`${growthRate > 0 ? '+' : ''}${growthRate}%`"
          :icon-bg-color="growthRate > 0 ? '#67c23a' : growthRate < 0 ? '#f56c6c' : '#909399'"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :icon="Select"
          label="已发布"
          :value="approvedCount"
          icon-bg-color="#e6a23c"
        />
      </el-col>
    </el-row>

    <!-- 图表展示 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>按级别分布</span>
          </template>
          <div ref="levelChartRef" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>
            <span>按部门分布</span>
          </template>
          <div ref="deptChartRef" style="width: 100%; height: 350px"></div>
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
            <span>按创建人分布</span>
          </template>
          <div ref="creatorChartRef" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Document, Plus, TrendCharts, Select } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import request from '@/api/request';
import exportApi from '@/api/export';
import StatCard from '@/components/StatCard.vue';

const filters = ref({
  level: undefined,
  departmentId: undefined,
  status: undefined,
  startDate: undefined,
  endDate: undefined
});

const dateRange = ref<[string, string] | null>(null);
const departments = ref<any[]>([]);
const statisticsData = ref<any>({});

const levelChartRef = ref<HTMLElement>();
const deptChartRef = ref<HTMLElement>();
const statusChartRef = ref<HTMLElement>();
const creatorChartRef = ref<HTMLElement>();

let levelChart: echarts.ECharts | null = null;
let deptChart: echarts.ECharts | null = null;
let statusChart: echarts.ECharts | null = null;
let creatorChart: echarts.ECharts | null = null;

const monthlyGrowth = computed(() => {
  return statisticsData.value.monthlyGrowth || 0;
});

const growthRate = computed(() => {
  return statisticsData.value.growthRate || 0;
});

const approvedCount = computed(() => {
  return statisticsData.value.byStatus?.find((s: any) => s.status === 'approved')?.count || 0;
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

const fetchData = async () => {
  try {
    const params: any = {};
    if (filters.value.level) params.level = filters.value.level;
    if (filters.value.departmentId) params.departmentId = filters.value.departmentId;
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.startDate) params.startDate = filters.value.startDate;
    if (filters.value.endDate) params.endDate = filters.value.endDate;

    const res = await request.get('/statistics/documents', { params });
    statisticsData.value = res.data || res;

    await nextTick();
    initCharts();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取文档统计数据失败');
  }
};

const resetFilters = () => {
  filters.value = {
    level: undefined,
    departmentId: undefined,
    status: undefined,
    startDate: undefined,
    endDate: undefined
  };
  dateRange.value = null;
  fetchData();
};

const exportData = async () => {
  try {
    const blob = await exportApi.exportStatistics('documents');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `文档统计_${new Date().toISOString().split('T')[0]}.xlsx`;
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
  initLevelChart();
  initDeptChart();
  initStatusChart();
  initCreatorChart();
};

const initLevelChart = () => {
  if (!levelChartRef.value) return;
  if (!levelChart) levelChart = echarts.init(levelChartRef.value);

  const byLevel = statisticsData.value.byLevel || [];
  const data = [
    { value: byLevel.find((l: any) => l.level === 1)?.count || 0, name: '一级文件' },
    { value: byLevel.find((l: any) => l.level === 2)?.count || 0, name: '二级文件' },
    { value: byLevel.find((l: any) => l.level === 3)?.count || 0, name: '三级文件' }
  ];

  levelChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: '级别分布',
      type: 'pie',
      radius: '50%',
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

const initDeptChart = () => {
  if (!deptChartRef.value) return;
  if (!deptChart) deptChart = echarts.init(deptChartRef.value);

  const byDepartment = statisticsData.value.byDepartment || [];
  const data = byDepartment.map((d: any) => ({
    name: d.name || d.departmentName || `部门${d.departmentId}`,
    value: d.count
  }));

  deptChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: data.map((d: any) => d.name) },
    yAxis: { type: 'value' },
    series: [{
      name: '文档数',
      type: 'bar',
      data: data.map((d: any) => d.value),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
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
    draft: '草稿',
    pending: '审批中',
    approved: '已发布',
    rejected: '已驳回'
  };

  const data = byStatus.map((s: any) => ({
    value: s.count,
    name: statusMap[s.status] || s.status
  }));

  statusChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      name: '状态分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false, position: 'center' },
      emphasis: {
        label: {
          show: true,
          fontSize: 20,
          fontWeight: 'bold'
        }
      },
      labelLine: { show: false },
      data
    }]
  });
};

const initCreatorChart = () => {
  if (!creatorChartRef.value) return;
  if (!creatorChart) creatorChart = echarts.init(creatorChartRef.value);

  const byCreator = statisticsData.value.byCreator || [];
  const top10 = byCreator.slice(0, 10);

  creatorChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: top10.map((c: any) => c.creatorName || `用户${c.creatorId}`)
    },
    series: [{
      name: '文档数',
      type: 'bar',
      data: top10.map((c: any) => c.count),
      itemStyle: { color: '#5470c6' }
    }]
  });
};

const resizeHandler = () => {
  levelChart?.resize();
  deptChart?.resize();
  statusChart?.resize();
  creatorChart?.resize();
};

onMounted(() => {
  fetchDepartments();
  fetchData();
  window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler);
  levelChart?.dispose();
  deptChart?.dispose();
  statusChart?.dispose();
  creatorChart?.dispose();
  levelChart = null;
  deptChart = null;
  statusChart = null;
  creatorChart = null;
});
</script>

<style scoped>
.document-statistics {
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

.summary-row {
  margin-bottom: 20px;
}

.chart-row {
  margin-bottom: 20px;
}
</style>
