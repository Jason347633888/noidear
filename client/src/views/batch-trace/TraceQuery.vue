<template>
  <div class="trace-query">
    <el-card class="search-card">
      <template #header>
        <span>批次追溯查询</span>
      </template>
      <el-form :model="queryForm" inline>
        <el-form-item label="批次号">
          <el-input
            v-model="queryForm.batchNumber"
            placeholder="请输入批次号"
            style="width: 260px"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="追溯方向">
          <el-radio-group v-model="queryForm.direction">
            <el-radio-button value="forward">正向追溯</el-radio-button>
            <el-radio-button value="backward">反向追溯</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            开始追溯
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="!result && !loading"
        title="操作说明"
        type="info"
        :closable="false"
        style="margin-top: 8px"
      >
        <template #default>
          <ul class="help-list">
            <li><b>正向追溯</b>：从原料批次查找所有使用该原料的生产批次及成品流向</li>
            <li><b>反向追溯</b>：从成品批次追溯所使用的所有原料批次来源</li>
          </ul>
        </template>
      </el-alert>
    </el-card>

    <el-card v-if="result" class="result-card">
      <template #header>
        <div class="card-header">
          <span>追溯结果 - {{ result.batchNumber }}</span>
          <div>
            <el-tag type="primary">{{ result.productName }}</el-tag>
            <el-button
              style="margin-left: 12px"
              @click="router.push(`/batch-trace/report?batchNumber=${result.batchNumber}`)"
            >
              查看完整报告
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="16">
        <el-col :span="12">
          <div class="chart-title">
            {{ queryForm.direction === 'forward' ? '正向追溯链路（原料 → 成品）' : '反向追溯链路（成品 → 原料）' }}
          </div>
          <div ref="chartRef" class="chart-container"></div>
        </el-col>
        <el-col :span="12">
          <div class="chart-title">节点明细</div>
          <el-table :data="nodeList" stripe max-height="400">
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="nodeTagType(row.type)" size="small">
                  {{ nodeTypeLabel(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="batchNumber" label="批次号" width="140" show-overflow-tooltip />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="date" label="日期" width="100" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button
                  v-if="row.batchNumber"
                  link
                  type="primary"
                  @click="navigateToBatch(row)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </el-card>

    <el-empty v-if="!loading && searched && !result" description="未找到该批次的追溯数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import { traceApi, type TraceNode, type TraceResult } from '@/api/batch';

interface FlatNode {
  type: string;
  name: string;
  batchNumber?: string;
  quantity?: number;
  date?: string;
}

const router = useRouter();
const loading = ref(false);
const searched = ref(false);
const result = ref<TraceResult | null>(null);
const nodeList = ref<FlatNode[]>([]);
const chartRef = ref<HTMLDivElement>();
let chartInstance: ECharts | null = null;

const queryForm = reactive({
  batchNumber: '',
  direction: 'forward' as 'forward' | 'backward',
});

const nodeTypeLabel = (type: string): string => {
  const map: Record<string, string> = { material: '物料', batch: '批次', product: '成品' };
  return map[type] || type;
};

const nodeTagType = (type: string): string => {
  const map: Record<string, string> = { material: 'warning', batch: 'primary', product: 'success' };
  return map[type] || 'info';
};

const flattenNodes = (nodes: TraceNode[]): FlatNode[] => {
  const result: FlatNode[] = [];
  const visit = (list: TraceNode[]) => {
    list.forEach((n) => {
      result.push({ type: n.type, name: n.name, batchNumber: n.batchNumber, quantity: n.quantity, date: n.date });
      if (n.children?.length) visit(n.children);
    });
  };
  visit(nodes);
  return result;
};

const buildEchartsTreeData = (nodes: TraceNode[]): any[] => {
  return nodes.map((n) => ({
    name: n.batchNumber || n.name,
    value: n.quantity,
    label: { show: true },
    itemStyle: { color: n.type === 'material' ? '#e6a23c' : n.type === 'product' ? '#67c23a' : '#409eff' },
    children: n.children?.length ? buildEchartsTreeData(n.children) : undefined,
  }));
};

const renderChart = (nodes: TraceNode[]) => {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }
  const treeData = buildEchartsTreeData(nodes);
  chartInstance.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const d = params.data;
        return `${d.name}${d.value ? `<br/>数量: ${d.value}` : ''}`;
      },
    },
    series: [{
      type: 'tree',
      data: treeData,
      top: '5%',
      left: '10%',
      bottom: '5%',
      right: '10%',
      symbolSize: 12,
      orient: 'vertical',
      label: { position: 'top', fontSize: 12 },
      leaves: { label: { position: 'bottom' } },
      expandAndCollapse: true,
      animationDuration: 550,
      animationDurationUpdate: 750,
    }],
  });
};

const handleSearch = async () => {
  if (!queryForm.batchNumber.trim()) {
    ElMessage.warning('请输入批次号');
    return;
  }

  loading.value = true;
  searched.value = true;
  result.value = null;

  try {
    let res: TraceResult;
    if (queryForm.direction === 'forward') {
      res = await traceApi.forwardTrace(queryForm.batchNumber.trim()) as TraceResult;
    } else {
      res = await traceApi.backwardTrace(queryForm.batchNumber.trim()) as TraceResult;
    }
    result.value = res;

    const nodes = queryForm.direction === 'forward' ? res.forwardTrace : res.backwardTrace;
    nodeList.value = flattenNodes(nodes);

    await nextTick();
    renderChart(nodes);
  } catch {
    ElMessage.error('追溯查询失败，请确认批次号是否存在');
  } finally {
    loading.value = false;
  }
};

const handleReset = () => {
  queryForm.batchNumber = '';
  queryForm.direction = 'forward';
  searched.value = false;
  result.value = null;
  nodeList.value = [];
  chartInstance?.clear();
};

const navigateToBatch = (row: FlatNode) => {
  if (row.batchNumber) {
    router.push(`/batch-trace/query?batchNumber=${row.batchNumber}`);
  }
};

onUnmounted(() => {
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.trace-query { padding: 0; }
.search-card { margin-bottom: 16px; }
.result-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.help-list { margin: 4px 0; padding-left: 16px; }
.help-list li { margin-bottom: 4px; font-size: 13px; }
.chart-container { width: 100%; height: 360px; }
.chart-title { font-weight: 500; font-size: 14px; margin-bottom: 12px; color: #606266; }
</style>
