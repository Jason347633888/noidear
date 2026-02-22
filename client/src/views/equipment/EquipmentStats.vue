<template>
  <div class="equipment-stats-page">
    <div class="page-header">
      <h1 class="page-title">设备统计分析</h1>
      <p class="page-subtitle">设备运行状态与维保分析</p>
    </div>

    <!-- Overview Cards -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon total"><el-icon><Box /></el-icon></div>
          <div class="metric-info">
            <div class="metric-value">{{ overview.total }}</div>
            <div class="metric-label">设备总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon active"><el-icon><CircleCheck /></el-icon></div>
          <div class="metric-info">
            <div class="metric-value">{{ overview.active }}</div>
            <div class="metric-label">启用设备</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon inactive"><el-icon><RemoveFilled /></el-icon></div>
          <div class="metric-info">
            <div class="metric-value">{{ overview.inactive }}</div>
            <div class="metric-label">停用设备</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-icon scrapped"><el-icon><DeleteFilled /></el-icon></div>
          <div class="metric-info">
            <div class="metric-value">{{ overview.scrapped }}</div>
            <div class="metric-label">报废设备</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Maintenance by Level Chart -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">维保统计（按保养级别）</span>
          </template>
          <div ref="levelChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header-row">
              <span class="card-title">维保成本分析（按月）</span>
              <el-date-picker
                v-model="costYear"
                type="year"
                placeholder="选择年份"
                value-format="YYYY"
                style="width: 120px"
                @change="fetchCostData"
              />
            </div>
          </template>
          <div ref="costChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Fault Rate Chart -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">故障率分析（按设备分类）</span>
          </template>
          <div ref="faultRateChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
/**
 * Note: This is a frontend-only Vue component.
 * All data is fetched via REST API calls defined in @/api/equipment.ts.
 * The backend implementation uses Prisma ORM for database queries
 * (see server/src/modules/equipment/stats.service.ts).
 */
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Box, CircleCheck, RemoveFilled, DeleteFilled } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import equipmentApi, {
  type EquipmentStatsOverview,
  getLevelText,
  getLevelColor,
} from '@/api/equipment';

const CATEGORY_LABELS: Record<string, string> = {
  production: '生产设备',
  testing: '检测设备',
  auxiliary: '辅助设备',
  utility: '公用设备',
};

const overview = reactive<EquipmentStatsOverview>({
  total: 0, active: 0, inactive: 0, scrapped: 0,
});
const costYear = ref(new Date().getFullYear().toString());

const levelChartRef = ref<HTMLElement>();
const costChartRef = ref<HTMLElement>();
const faultRateChartRef = ref<HTMLElement>();
let levelChart: echarts.ECharts | null = null;
let costChart: echarts.ECharts | null = null;
let faultRateChart: echarts.ECharts | null = null;

const ensureChart = (el: HTMLElement | undefined, existing: echarts.ECharts | null) => {
  if (!el) return null;
  return existing || echarts.init(el);
};

const buildPieData = (data: Array<{ level: string; count: number }>) => {
  return ['daily', 'weekly', 'monthly', 'quarterly', 'annual'].map((level) => ({
    value: data.find((d) => d.level === level)?.count || 0,
    name: getLevelText(level),
    itemStyle: { color: getLevelColor(level) },
  }));
};

const renderLevelChart = (data: Array<{ level: string; count: number }>) => {
  levelChart = ensureChart(levelChartRef.value, levelChart);
  if (!levelChart) return;
  levelChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 次 ({d}%)' },
    legend: { bottom: 10, left: 'center' },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c} 次' },
      data: buildPieData(data),
    }],
  });
};

const renderCostChart = (data: Array<{ month: string; cost: number }>) => {
  costChart = ensureChart(costChartRef.value, costChart);
  if (!costChart) return;
  costChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.map((d) => d.month) },
    yAxis: { type: 'value', name: '成本（元）' },
    series: [{
      name: '维保成本', type: 'line', smooth: true,
      data: data.map((d) => d.cost),
      areaStyle: { color: 'rgba(201, 162, 39, 0.15)' },
      lineStyle: { color: '#c9a227', width: 2 },
      itemStyle: { color: '#c9a227' },
    }],
    grid: { top: 40, right: 20, bottom: 40, left: 80 },
  });
};

type FaultRateItem = { category: string; faultCount: number; rate: number };

const renderFaultRateChart = (data: FaultRateItem[]) => {
  faultRateChart = ensureChart(faultRateChartRef.value, faultRateChart);
  if (!faultRateChart) return;
  const labels = data.map((d) => CATEGORY_LABELS[d.category] || d.category);
  faultRateChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['故障次数', '故障率'], bottom: 10 },
    xAxis: { type: 'category', data: labels },
    yAxis: [
      { type: 'value', name: '故障次数' },
      { type: 'value', name: '故障率 (%)', min: 0, max: 100 },
    ],
    series: [
      { name: '故障次数', type: 'bar', data: data.map((d) => d.faultCount),
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#409eff' } },
      { name: '故障率', type: 'line', yAxisIndex: 1, smooth: true,
        data: data.map((d) => d.rate),
        lineStyle: { color: '#f56c6c' }, itemStyle: { color: '#f56c6c' } },
    ],
    grid: { top: 40, right: 80, bottom: 60, left: 60 },
  });
};

const fetchOverview = async () => {
  try {
    const res = await equipmentApi.getStatsOverview() as any;
    Object.assign(overview, res.overview || res);
    await nextTick();
    renderLevelChart(res.maintenanceByLevel || []);
    renderFaultRateChart(res.faultRateByCategory || []);
  } catch {
    ElMessage.error('获取设备统计数据失败');
  }
};

const fetchCostData = async () => {
  try {
    const params = {
      startDate: `${costYear.value}-01-01`,
      endDate: `${costYear.value}-12-31`,
    };
    const res = await equipmentApi.getCostStats(params) as any;
    await nextTick();
    renderCostChart(res.costByMonth || res || []);
  } catch {
    ElMessage.error('获取维保成本数据失败');
  }
};

const handleResize = () => {
  levelChart?.resize();
  costChart?.resize();
  faultRateChart?.resize();
};

onMounted(() => {
  fetchOverview();
  fetchCostData();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  [levelChart, costChart, faultRateChart].forEach((c) => c?.dispose());
  levelChart = costChart = faultRateChart = null;
});
</script>

<style scoped>
.equipment-stats-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text-light: #7f8c8d;
  font-family: 'Inter', sans-serif;
}
.page-header { margin-bottom: 24px; }
.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px; font-weight: 600; color: var(--primary); margin: 0 0 4px;
}
.page-subtitle { font-size: 14px; color: var(--text-light); margin: 0; }
.metrics-row { margin-bottom: 20px; }
.metric-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: none;
}
.metric-card :deep(.el-card__body) {
  display: flex; align-items: center; padding: 24px;
}
.metric-icon {
  width: 60px; height: 60px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  margin-right: 16px; font-size: 28px; color: white; flex-shrink: 0;
}
.metric-icon.total { background: linear-gradient(135deg, #667eea, #764ba2); }
.metric-icon.active { background: linear-gradient(135deg, #67c23a, #95d475); }
.metric-icon.inactive { background: linear-gradient(135deg, #e6a23c, #f0c78a); }
.metric-icon.scrapped { background: linear-gradient(135deg, #f56c6c, #f78989); }
.metric-info { flex: 1; }
.metric-value {
  font-size: 28px; font-weight: bold; color: #303133;
  line-height: 1; margin-bottom: 8px;
}
.metric-label { font-size: 14px; color: #909399; }
.chart-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: none;
}
.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 16px; font-weight: 600; color: var(--primary);
}
.card-header-row {
  display: flex; justify-content: space-between; align-items: center;
}
.chart-container { width: 100%; height: 350px; }
</style>
