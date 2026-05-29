<template>
  <div class="batch-detail" v-loading="loading">
    <PageHeaderBlock eyebrow="追溯与批次" title="批次详情">
      <template #actions>
        <el-button @click="router.push(`/batch-trace/${batchId}/trace`)">查看追溯链</el-button>
        <el-button @click="handleExport">导出报告</el-button>
      </template>
    </PageHeaderBlock>

    <div class="app-panel" style="margin-bottom: 16px" v-if="batch">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">批次信息</h3>
        <div class="app-panel-header__actions">
          <el-tag :type="statusTypeMap[batch.status]">
            {{ statusTextMap[batch.status] }}
          </el-tag>
        </div>
      </div>
      <div class="app-panel--padded">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="批次号">{{ batch.batchNumber }}</el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ batch.productName }}</el-descriptions-item>
          <el-descriptions-item label="产品代码">{{ batch.productCode }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ batch.quantity }} {{ batch.unit }}</el-descriptions-item>
          <el-descriptions-item label="开始日期">
            {{ batch.startDate ? new Date(batch.startDate).toLocaleDateString('zh-CN') : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="结束日期">
            {{ batch.endDate ? new Date(batch.endDate).toLocaleDateString('zh-CN') : '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">物料使用记录</h3>
      </div>
      <div class="app-panel--padded">
        <el-table :data="materialUsages" stripe>
          <el-table-column label="物料名称" min-width="180">
            <template #default="{ row }">{{ row.material?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="物料批次" width="160">
            <template #default="{ row }">{{ row.materialBatch?.batchNumber || '-' }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="使用量" width="120" />
          <el-table-column prop="usedAt" label="使用时间" width="180">
            <template #default="{ row }">{{ new Date(row.usedAt).toLocaleString('zh-CN') }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 配料执行归集 -->
    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">配料执行归集</h3>
        <div class="app-panel-header__actions">
          <el-button
            v-if="hasDraftAggregations"
            size="small"
            type="success"
            :loading="confirmingAggregation"
            @click="handleConfirmAggregation"
          >确认归集</el-button>
          <el-button size="small" type="primary" @click="openAggregationPanel">+ 归集配料执行</el-button>
        </div>
      </div>
      <div class="app-panel--padded">
        <div v-if="batch?.aggregations?.length">
          <div v-for="agg in batch.aggregations" :key="agg.id" style="margin-bottom: 12px; padding: 8px; background: #f9f9f9; border-radius: 4px">
            <div><strong>配料执行号：</strong>{{ agg.mixingExecution?.executionNo }}</div>
            <div><strong>配料区：</strong>{{ agg.mixingExecution?.area?.name }}</div>
            <div><strong>实际配料重量：</strong>{{ agg.mixingExecution?.actual_weight }}</div>
            <div v-if="isSharedMixingExecution(agg)">
              <strong>归集方式：</strong>
              <el-tag type="warning" size="small">共用配料执行</el-tag>
              <span style="margin-left: 8px">{{ linkedBatchNumbers(agg) }}</span>
            </div>
            <div><strong>状态：</strong>{{ agg.status }}</div>
          </div>
        </div>
        <el-empty v-else description="暂无配料执行归集" />
      </div>
    </div>

    <!-- 归集选择面板 -->
    <el-dialog v-model="showAggregationPanel" title="选择配料执行" width="700px">
      <p style="color: #666; margin-bottom: 12px">选择要归集到此产品批次的配料执行记录</p>
      <el-table :data="candidateMixingExecutions" row-key="id" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="executionNo" label="配料执行号" />
        <el-table-column prop="area.name" label="配料区" />
        <el-table-column prop="actual_weight" label="实际配料重量" />
        <el-table-column prop="work_date" label="配料日期" />
      </el-table>
      <template #footer>
        <el-button @click="showAggregationPanel = false">取消</el-button>
        <el-button type="primary" @click="submitAggregationDraft">提交归集</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { productionBatchApi, materialUsageApi, batchMixingAggregationApi } from '@/api/batch';
import { useUserStore } from '@/stores/user';
import request from '@/api/request';

const userStore = useUserStore();

const route = useRoute();
const router = useRouter();
const batchId = route.params.id as string;
const loading = ref(false);
const batch = ref<any>(null);
const materialUsages = ref<any[]>([]);

const statusTextMap: Record<string, string> = {
  planned: '已计划', in_progress: '进行中', completed: '已完成', cancelled: '已取消',
};
const statusTypeMap: Record<string, string> = {
  planned: 'info', in_progress: 'primary', completed: 'success', cancelled: 'warning',
};

const showAggregationPanel = ref(false);
const candidateMixingExecutions = ref<any[]>([]);
const selectedExecutions = ref<any[]>([]);
const handleSelectionChange = (rows: any[]) => {
  selectedExecutions.value = rows;
};
const confirmingAggregation = ref(false);
const hasDraftAggregations = computed(() =>
  batch.value?.aggregations?.some((a: any) => a.status === 'draft') ?? false,
);

const linkedProductionBatches = (agg: any) =>
  agg?.mixingExecution?.aggregations
    ?.map((item: any) => item.productionBatch)
    ?.filter(Boolean) ?? [];

const isSharedMixingExecution = (agg: any) =>
  linkedProductionBatches(agg).length > 1;

const linkedBatchNumbers = (agg: any) =>
  linkedProductionBatches(agg)
    .map((batch: any) => batch.batchNumber || batch.id)
    .join('、');

const submitAggregationDraft = async () => {
  if (!selectedExecutions.value.length) {
    ElMessage.warning('请选择至少一个配料执行');
    return;
  }
  try {
    await batchMixingAggregationApi.create({
      productionBatchId: batch.value?.id,
      mixingExecutionIds: selectedExecutions.value.map((e) => e.id),
    });
    ElMessage.success('归集成功');
    showAggregationPanel.value = false;
    await fetchBatch();
  } catch {
    ElMessage.error('归集失败');
  }
};

const openAggregationPanel = async () => {
  showAggregationPanel.value = true;
  try {
    const res: any = await request.get('/mixing/executions', {
      params: { productId: batch.value?.productId, status: 'confirmed' },
    });
    candidateMixingExecutions.value = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : [];
  } catch {
    ElMessage.error('加载候选配料执行失败');
  }
};

const handleConfirmAggregation = async () => {
  confirmingAggregation.value = true;
  try {
    await batchMixingAggregationApi.confirm({
      productionBatchId: batch.value?.id,
      confirmedBy: userStore.user?.id ?? 'unknown',
    });
    ElMessage.success('归集已确认');
    await fetchBatch();
  } catch {
    ElMessage.error('归集确认失败');
  } finally {
    confirmingAggregation.value = false;
  }
};

const downloadBlob = (data: any, filename: string) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const fetchBatch = async () => {
  loading.value = true;
  try {
    const res: any = await productionBatchApi.getById(batchId);
    batch.value = res;
    materialUsages.value = res.materialUsages || [];
  } catch (error) {
    ElMessage.error('获取批次详情失败');
  } finally {
    loading.value = false;
  }
};

const fetchUsages = async () => {
  try {
    const res: any = await materialUsageApi.getByBatch(batchId);
    materialUsages.value = res;
  } catch (error) {
    ElMessage.error('获取物料使用记录失败');
  }
};

const handleExport = async () => {
  try {
    const res: any = await request.get(`/batch-trace/trace/${batchId}/export-pdf`, {
      responseType: 'blob',
    });
    const filename = `trace-report-${batch.value?.batchNumber || batchId}.pdf`;
    downloadBlob(res, filename);
    ElMessage.success('报告导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

onMounted(async () => {
  await fetchBatch();
  await fetchUsages();
});
</script>

<style scoped>
.batch-detail { padding: 0; }
</style>
