<template>
  <el-card v-if="result" shadow="never" style="margin-top: 16px">
    <div class="view-header">台账视图</div>
    <el-table :data="result.ledger.rows" border stripe>
      <el-table-column prop="nodeType" label="节点类型" width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="nodeTypeTag(row.nodeType)">{{ nodeTypeLabel(row.nodeType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="label" label="名称/描述" />
      <el-table-column prop="batchNo" label="批号" width="160" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="riskLevel" label="风险" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.riskLevel" size="small" :type="riskTag(row.riskLevel)">
            {{ row.riskLevel }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!result.ledger?.rows?.length" description="无台账数据" />
  </el-card>
</template>

<script setup lang="ts">
import type { TraceQueryResult } from '@/types/traceability';

defineProps<{ result: TraceQueryResult | null }>();

const nodeTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    materialLot: '原料批次',
    ingredientUsage: '投料',
    productionBatch: '产品批次',
    deliveryNote: '发货单',
  };
  return map[type] ?? type;
};

const nodeTypeTag = (type: string) => {
  const map: Record<string, string> = {
    materialLot: '',
    ingredientUsage: 'info',
    productionBatch: 'success',
    deliveryNote: 'danger',
  };
  return map[type] ?? '';
};

const riskTag = (level: string) => {
  const map: Record<string, string> = {
    normal: 'success',
    minor: 'info',
    important: 'warning',
    high: 'danger',
  };
  return map[level] ?? 'info';
};
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
</style>
