<template>
  <div class="batch-detail" v-loading="loading">
    <el-page-header @back="router.back()" content="批次详情" />

    <el-card class="info-card" v-if="batch">
      <template #header>
        <div class="card-header">
          <span>批次信息</span>
          <el-tag :type="statusTypeMap[batch.status]">
            {{ statusTextMap[batch.status] }}
          </el-tag>
        </div>
      </template>
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
    </el-card>

    <el-card class="usage-card">
      <template #header>
        <div class="card-header">
          <span>物料使用记录</span>
          <el-button
            v-if="batch?.status === 'in_progress'"
            type="primary"
            size="small"
            @click="usageDialogVisible = true"
          >
            添加物料
          </el-button>
        </div>
      </template>
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
    </el-card>

    <!-- 配料执行归集 -->
    <el-card style="margin-top: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>配料执行归集</span>
          <div style="display: flex; gap: 8px">
            <el-button
              v-if="hasDraftAggregations"
              size="small"
              type="success"
              :loading="confirmingAggregation"
              @click="handleConfirmAggregation"
            >确认归集</el-button>
            <el-button size="small" type="primary" @click="showAggregationPanel = true">+ 归集配料执行</el-button>
          </div>
        </div>
      </template>
      <div v-if="batch?.aggregations?.length">
        <div v-for="agg in batch.aggregations" :key="agg.id" style="margin-bottom: 12px; padding: 8px; background: #f9f9f9; border-radius: 4px">
          <div><strong>配料执行号：</strong>{{ agg.mixingExecution?.executionNo }}</div>
          <div><strong>配料区：</strong>{{ agg.mixingExecution?.area?.name }}</div>
          <div><strong>实际配料重量：</strong>{{ agg.mixingExecution?.actual_weight }}</div>
          <div><strong>状态：</strong>{{ agg.status }}</div>
        </div>
      </div>
      <el-empty v-else description="暂无配料执行归集" />
    </el-card>

    <!-- 归集选择面板 -->
    <el-dialog v-model="showAggregationPanel" title="选择配料执行" width="700px">
      <p style="color: #666; margin-bottom: 12px">选择要归集到此产品批次的配料执行记录</p>
      <el-table :data="candidateMixingExecutions" row-key="id" @selection-change="selectedExecutions = $event">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="executionNo" label="配料执行号" />
        <el-table-column prop="area.name" label="配料区" />
        <el-table-column prop="actual_weight" label="实际配料重量" />
        <el-table-column prop="work_date" label="配料日期" />
      </el-table>
      <template #footer>
        <el-button @click="showAggregationPanel = false">取消</el-button>
        <el-button type="primary" @click="confirmAggregation">确认归集</el-button>
      </template>
    </el-dialog>

    <div class="actions">
      <el-button @click="router.push(`/batch-trace/${batchId}/trace`)">查看追溯链</el-button>
      <el-button @click="handleExport">导出报告</el-button>
    </div>

    <!-- 添加物料对话框 -->
    <el-dialog v-model="usageDialogVisible" title="添加物料使用" width="500px">
      <el-form label-width="100px">
        <el-form-item label="配方明细">
          <el-select v-model="usageForm.recipeLineId" placeholder="选择配方物料行" style="width: 100%" clearable>
            <el-option
              v-for="line in recipeLines"
              :key="line.id"
              :label="`${line.area_name_snapshot ? '[' + line.area_name_snapshot + '] ' : ''}${line.material_id} × ${line.qty_per_batch}${line.unit}`"
              :value="line.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="物料批次ID">
          <el-input v-model="usageForm.materialBatchId" placeholder="请输入物料批次 ID" />
        </el-form-item>
        <el-form-item label="使用量">
          <el-input-number v-model="usageForm.quantity" :min="0.01" :step="0.1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="usageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddUsage" :loading="addingUsage">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { productionBatchApi, materialUsageApi, batchMixingAggregationApi } from '@/api/batch';
import { recipeApi, type RecipeLine } from '@/api/recipe';
import request from '@/api/request';

const route = useRoute();
const router = useRouter();
const batchId = route.params.id as string;
const loading = ref(false);
const addingUsage = ref(false);
const usageDialogVisible = ref(false);
const batch = ref<any>(null);
const materialUsages = ref<any[]>([]);
const recipeLines = ref<RecipeLine[]>([]);

const statusTextMap: Record<string, string> = {
  planned: '已计划', in_progress: '进行中', completed: '已完成', cancelled: '已取消',
};
const statusTypeMap: Record<string, string> = {
  planned: 'info', in_progress: 'primary', completed: 'success', cancelled: 'warning',
};

const usageForm = reactive({ recipeLineId: '', materialBatchId: '', quantity: 1 });

const showAggregationPanel = ref(false);
const candidateMixingExecutions = ref<any[]>([]);
const selectedExecutions = ref<any[]>([]);
const confirmingAggregation = ref(false);
const hasDraftAggregations = computed(() =>
  batch.value?.aggregations?.some((a: any) => a.status === 'draft') ?? false,
);

const confirmAggregation = async () => {
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

const handleConfirmAggregation = async () => {
  confirmingAggregation.value = true;
  try {
    await batchMixingAggregationApi.confirm({
      productionBatchId: batch.value?.id,
      confirmedBy: 'operator',
    });
    ElMessage.success('归集已确认');
    await fetchBatch();
  } catch {
    ElMessage.error('归集确认失败');
  } finally {
    confirmingAggregation.value = false;
  }
};

const resetUsageForm = () => {
  usageForm.recipeLineId = '';
  usageForm.materialBatchId = '';
  usageForm.quantity = 1;
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
    if (res.recipeId) {
      const recipe: any = await recipeApi.getOne(res.recipeId);
      recipeLines.value = recipe?.lines ?? [];
    }
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

const handleAddUsage = async () => {
  if (!usageForm.recipeLineId || !usageForm.materialBatchId) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  addingUsage.value = true;
  try {
    await materialUsageApi.addUsage({
      productionBatchId: batchId,
      materialBatchId: usageForm.materialBatchId,
      recipeLineId: usageForm.recipeLineId,
      quantity: usageForm.quantity,
    });
    ElMessage.success('物料添加成功');
    usageDialogVisible.value = false;
    resetUsageForm();
    fetchUsages();
  } catch (error) {
    ElMessage.error('物料添加失败');
  } finally {
    addingUsage.value = false;
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
.info-card { margin-top: 16px; margin-bottom: 16px; }
.usage-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.actions { display: flex; gap: 12px; }
</style>
