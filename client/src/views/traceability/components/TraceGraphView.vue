<template>
  <el-card v-if="result" shadow="never" style="margin-top: 16px">
    <div class="view-header">链路图视图</div>
    <div v-if="result.graph?.nodes?.length" class="graph-container">
      <div class="node-list">
        <div
          v-for="node in result.graph.nodes"
          :key="node.id"
          class="graph-node"
          :class="`node-${node.riskLevel ?? 'normal'}`"
        >
          <span class="node-type">{{ node.type }}</span>
          <span class="node-label">{{ node.label }}</span>
        </div>
      </div>
      <div v-if="result.graph.edges?.length" class="edge-list">
        <div v-for="edge in result.graph.edges" :key="edge.id" class="graph-edge">
          {{ edge.source }} → {{ edge.target }}
          <el-tag size="small" type="info" style="margin-left: 8px">{{ edge.relation }}</el-tag>
        </div>
      </div>
    </div>
    <el-empty v-else description="无图谱数据" />
  </el-card>
</template>

<script setup lang="ts">
import type { TraceQueryResult } from '@/types/traceability';

defineProps<{ result: TraceQueryResult | null }>();
</script>

<style scoped>
.view-header {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #c9a227;
}

.graph-container {
  display: flex;
  gap: 24px;
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 240px;
}

.graph-node {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-normal { border-color: #67c23a; }
.node-minor { border-color: #909399; }
.node-important { border-color: #e6a23c; }
.node-high { border-color: #f56c6c; }

.node-type {
  font-size: 11px;
  color: #909399;
}

.node-label {
  font-size: 13px;
  font-weight: 500;
}

.edge-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.graph-edge {
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
</style>
