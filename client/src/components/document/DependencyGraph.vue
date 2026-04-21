<template>
  <div class="dependency-graph">
    <div class="graph-toolbar">
      <span class="graph-title">文档依赖关系图</span>
      <el-button size="small" :loading="loading" @click="loadData">刷新</el-button>
    </div>
    <div v-if="loading" class="graph-loading">
      <el-skeleton :rows="4" animated />
    </div>
    <div v-else-if="hasNodes" ref="chartRef" class="chart-container" />
    <el-empty v-else description="暂无文档依赖关系" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import request from '@/api/request';

interface ImpactNode {
  docId: string;
  title: string;
  type: 'source' | 'target' | 'affected';
}

interface ImpactEdge {
  from: string;
  to: string;
}

interface ImpactData {
  nodes: ImpactNode[];
  edges: ImpactEdge[];
}

const props = defineProps<{
  documentId: string;
}>();

const loading = ref(false);
const graphData = ref<ImpactData | null>(null);
const chartRef = ref<HTMLDivElement>();
let chartInstance: ECharts | null = null;

const hasNodes = computed(() => (graphData.value?.nodes?.length ?? 0) > 0);

const loadData = async () => {
  if (!props.documentId) return;
  loading.value = true;
  graphData.value = null;
  try {
    const res = await request.get<ImpactData>(`/documents/${props.documentId}/reference-impact`);
    graphData.value = res;
    await nextTick();
    renderChart();
  } catch {
    ElMessage.error('获取文档依赖关系失败');
  } finally {
    loading.value = false;
  }
};

const renderChart = () => {
  if (!chartRef.value || !graphData.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const colorMap: Record<string, string> = { source: '#409eff', target: '#67c23a', affected: '#e6a23c' };
  const nodes = graphData.value.nodes.map((n) => ({
    id: n.docId,
    name: n.title.length > 16 ? n.title.slice(0, 16) + '…' : n.title,
    symbolSize: n.type === 'source' ? 48 : 32,
    itemStyle: { color: colorMap[n.type] || '#909399' },
    label: { show: true, fontSize: 11 },
  }));

  const links = graphData.value.edges.map((e) => ({
    source: e.from,
    target: e.to,
    lineStyle: { color: '#c0c4cc', width: 1.5 },
  }));

  chartInstance.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => params.data?.name || '',
    },
    legend: {
      data: [
        { name: '当前文档', icon: 'circle', itemStyle: { color: '#409eff' } },
        { name: '被引用文档', icon: 'circle', itemStyle: { color: '#67c23a' } },
        { name: '受影响文档', icon: 'circle', itemStyle: { color: '#e6a23c' } },
      ],
      bottom: 0,
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links,
      roam: true,
      draggable: true,
      force: { repulsion: 200, edgeLength: 120 },
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: 8,
    }],
  });
};

onMounted(() => {
  loadData();
});

onUnmounted(() => {
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.dependency-graph { width: 100%; }
.graph-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.graph-title { font-weight: 500; color: #303133; }
.graph-loading { padding: 16px; }
.chart-container { width: 100%; height: 400px; }
</style>
