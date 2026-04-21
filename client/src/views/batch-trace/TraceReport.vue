<template>
  <div class="trace-report">
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span>批次追溯报告</span>
          <el-button
            v-if="report"
            type="primary"
            :loading="exporting"
            @click="handleExport"
          >
            导出 PDF
          </el-button>
        </div>
      </template>
      <el-form :model="queryForm" inline>
        <el-form-item label="批次号">
          <el-input
            v-model="queryForm.batchNumber"
            placeholder="请输入批次号"
            style="width: 260px"
            clearable
            @keyup.enter="loadReport"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="loadReport">查询报告</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="10" animated />
    </div>

    <template v-else-if="report">
      <!-- 追溯摘要 -->
      <el-card class="summary-card">
        <template #header>
          <span>追溯摘要</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="批次号">
            <el-tag>{{ report.batchNumber }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ report.productName }}</el-descriptions-item>
          <el-descriptions-item label="产品编码">{{ report.productCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="生产数量">{{ report.quantity }}{{ report.unit }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(report.status)">{{ statusLabel(report.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="生成时间">{{ formatDate(report.generatedAt || new Date().toISOString()) }}</el-descriptions-item>
          <el-descriptions-item label="生产开始">{{ formatDate(report.startDate) }}</el-descriptions-item>
          <el-descriptions-item label="生产结束">{{ formatDate(report.endDate) }}</el-descriptions-item>
          <el-descriptions-item label="涉及物料数">{{ report.materialCount ?? '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 正向追溯链路 -->
      <el-card class="chain-card">
        <template #header>
          <div class="section-header">
            <span>正向追溯链路（原料 → 成品流向）</span>
            <el-tag type="primary" size="small">{{ forwardList.length }} 个节点</el-tag>
          </div>
        </template>
        <el-table :data="forwardList" stripe border>
          <el-table-column label="层级" width="70" align="center">
            <template #default="{ row }">
              <el-tag size="small" type="info">L{{ row.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="节点类型" width="90">
            <template #default="{ row }">
              <el-tag :type="nodeTagType(row.type)" size="small">{{ nodeTypeLabel(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
          <el-table-column prop="batchNumber" label="批次号" width="180" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="90" align="right" />
          <el-table-column prop="date" label="日期" width="110" />
        </el-table>
      </el-card>

      <!-- 反向追溯链路 -->
      <el-card class="chain-card">
        <template #header>
          <div class="section-header">
            <span>反向追溯链路（成品 → 原料溯源）</span>
            <el-tag type="warning" size="small">{{ backwardList.length }} 个节点</el-tag>
          </div>
        </template>
        <el-table :data="backwardList" stripe border>
          <el-table-column label="层级" width="70" align="center">
            <template #default="{ row }">
              <el-tag size="small" type="info">L{{ row.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="节点类型" width="90">
            <template #default="{ row }">
              <el-tag :type="nodeTagType(row.type)" size="small">{{ nodeTypeLabel(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
          <el-table-column prop="batchNumber" label="批次号" width="180" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="90" align="right" />
          <el-table-column prop="date" label="日期" width="110" />
        </el-table>
      </el-card>
    </template>

    <el-empty
      v-else-if="searched && !report"
      description="未找到该批次的追溯报告"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import { traceApi, type TraceNode, type TraceResult } from '@/api/batch';

interface FlatTraceNode {
  level: number;
  type: string;
  name: string;
  batchNumber?: string;
  quantity?: number;
  date?: string;
}

interface TraceReport extends TraceResult {
  productCode?: string;
  quantity?: number;
  unit?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  generatedAt?: string;
  materialCount?: number;
}

const route = useRoute();
const loading = ref(false);
const exporting = ref(false);
const searched = ref(false);
const report = ref<TraceReport | null>(null);
const forwardList = ref<FlatTraceNode[]>([]);
const backwardList = ref<FlatTraceNode[]>([]);

const queryForm = reactive({
  batchNumber: (route.query.batchNumber as string) || '',
});

const nodeTypeLabel = (type: string): string => {
  const map: Record<string, string> = { material: '物料', batch: '批次', product: '成品' };
  return map[type] || type;
};

const nodeTagType = (type: string): string => {
  const map: Record<string, string> = { material: 'warning', batch: 'primary', product: 'success' };
  return map[type] || 'info';
};

const statusLabel = (status?: string): string => {
  const map: Record<string, string> = {
    planned: '计划中', in_progress: '进行中', completed: '已完成', cancelled: '已取消',
  };
  return status ? (map[status] || status) : '-';
};

const statusType = (status?: string): string => {
  const map: Record<string, string> = {
    planned: 'info', in_progress: 'warning', completed: 'success', cancelled: 'danger',
  };
  return status ? (map[status] || 'info') : 'info';
};

const formatDate = (date?: string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const flattenNodes = (nodes: TraceNode[], level = 1): FlatTraceNode[] => {
  const result: FlatTraceNode[] = [];
  const visit = (list: TraceNode[], lvl: number) => {
    list.forEach((n) => {
      result.push({ level: lvl, type: n.type, name: n.name, batchNumber: n.batchNumber, quantity: n.quantity, date: n.date });
      if (n.children?.length) visit(n.children, lvl + 1);
    });
  };
  visit(nodes, level);
  return result;
};

const loadReport = async () => {
  const batchNum = queryForm.batchNumber.trim();
  if (!batchNum) {
    ElMessage.warning('请输入批次号');
    return;
  }

  loading.value = true;
  searched.value = true;
  report.value = null;

  try {
    const res = await traceApi.fullTrace(batchNum) as TraceReport;
    report.value = res;
    forwardList.value = flattenNodes(res.forwardTrace ?? []);
    backwardList.value = flattenNodes(res.backwardTrace ?? []);
  } catch {
    ElMessage.error('获取追溯报告失败，请确认批次号是否正确');
  } finally {
    loading.value = false;
  }
};

const handleExport = async () => {
  if (!queryForm.batchNumber.trim()) return;

  exporting.value = true;
  try {
    const res = await request.get(
      `/batch-trace/trace-export/${queryForm.batchNumber.trim()}/report`,
      { responseType: 'blob' },
    );
    const blob = new Blob([res as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trace-report-${queryForm.batchNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('PDF 导出成功');
  } catch {
    ElMessage.error('PDF 导出失败');
  } finally {
    exporting.value = false;
  }
};

onMounted(() => {
  if (queryForm.batchNumber) {
    loadReport();
  }
});
</script>

<style scoped>
.trace-report { padding: 0; }
.search-card { margin-bottom: 16px; }
.summary-card { margin-bottom: 16px; }
.chain-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.section-header { display: flex; align-items: center; gap: 12px; }
.loading-wrap { padding: 24px; }
</style>
