<template>
  <div class="trace-visualization" v-loading="loading">
    <el-page-header @back="router.back()" content="批次追溯" />

    <el-card class="trace-card" v-if="traceResult">
      <template #header>
        <div class="card-header">
          <span>追溯链 - {{ traceResult.batchNumber }}</span>
          <div>
            <el-radio-group v-model="traceDirection" size="small">
              <el-radio-button value="forward">正向追溯</el-radio-button>
              <el-radio-button value="backward">逆向追溯</el-radio-button>
              <el-radio-button value="full">完整追溯</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <div class="trace-info">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="批次号">{{ traceResult.batchNumber }}</el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ traceResult.productName }}</el-descriptions-item>
          <el-descriptions-item label="追溯方向">
            {{ directionLabel }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-divider />

      <div class="trace-tree">
        <el-tree
          :data="treeData"
          :props="{ label: 'label', children: 'children' }"
          default-expand-all
          :expand-on-click-node="false"
        >
          <template #default="{ node, data }">
            <div class="tree-node">
              <el-tag :type="nodeTypeMap[data.type]" size="small">
                {{ nodeTypeLabel[data.type] }}
              </el-tag>
              <span class="node-name">{{ data.name }}</span>
              <span v-if="data.batchNumber" class="node-batch">({{ data.batchNumber }})</span>
              <span v-if="data.quantity" class="node-quantity">数量：{{ data.quantity }}</span>
              <span v-if="data.date" class="node-date">{{ data.date }}</span>
            </div>
          </template>
        </el-tree>
      </div>
    </el-card>

    <el-empty v-if="!loading && !traceResult" description="未找到追溯数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { traceApi, type TraceResult, type TraceNode } from '@/api/batch';

const route = useRoute();
const router = useRouter();
const batchId = route.params.id as string;
const loading = ref(false);
const traceResult = ref<TraceResult | null>(null);
const traceDirection = ref('full');

const nodeTypeMap: Record<string, string> = { material: 'warning', batch: 'primary', product: 'success' };
const nodeTypeLabel: Record<string, string> = { material: '物料', batch: '批次', product: '成品' };
const directionLabel = computed(() => {
  const map: Record<string, string> = { forward: '正向追溯', backward: '逆向追溯', full: '完整追溯' };
  return map[traceDirection.value] || '';
});

interface TreeItem {
  label: string;
  name: string;
  type: string;
  batchNumber?: string;
  quantity?: number;
  date?: string;
  children?: TreeItem[];
}

const mapTraceNodes = (nodes: TraceNode[]): TreeItem[] => {
  return nodes.map((n) => ({
    label: n.name,
    name: n.name,
    type: n.type,
    batchNumber: n.batchNumber,
    quantity: n.quantity,
    date: n.date,
    children: n.children ? mapTraceNodes(n.children) : undefined,
  }));
};

const treeData = computed(() => {
  if (!traceResult.value) return [];
  if (traceDirection.value === 'forward') return mapTraceNodes(traceResult.value.forwardTrace);
  if (traceDirection.value === 'backward') return mapTraceNodes(traceResult.value.backwardTrace);
  return [
    ...mapTraceNodes(traceResult.value.backwardTrace),
    ...mapTraceNodes(traceResult.value.forwardTrace),
  ];
});

const fetchTrace = async () => {
  loading.value = true;
  try {
    const res: any = await traceApi.fullTrace(batchId);
    traceResult.value = res;
  } catch (error) {
    ElMessage.error('获取追溯数据失败');
  } finally {
    loading.value = false;
  }
};

watch(traceDirection, () => { fetchTrace(); });

onMounted(() => { fetchTrace(); });
</script>

<style scoped>
.trace-visualization { padding: 0; }
.trace-card { margin-top: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.trace-info { margin-bottom: 16px; }
.tree-node { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.node-name { font-weight: 500; }
.node-batch { color: #409eff; font-size: 12px; }
.node-quantity { color: #67c23a; font-size: 12px; }
.node-date { color: #909399; font-size: 12px; }
</style>
