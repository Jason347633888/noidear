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

    <div class="actions">
      <el-button @click="router.push(`/batch-trace/${batchId}/trace`)">查看追溯链</el-button>
      <el-button @click="handleExport">导出报告</el-button>
    </div>

    <!-- 添加物料对话框 -->
    <el-dialog v-model="usageDialogVisible" title="添加物料使用" width="500px">
      <el-form label-width="100px">
        <el-form-item label="物料ID">
          <el-input v-model="usageForm.materialId" placeholder="请输入物料 ID" />
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
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { productionBatchApi, materialUsageApi, traceApi } from '@/api/batch';

const route = useRoute();
const router = useRouter();
const batchId = route.params.id as string;
const loading = ref(false);
const addingUsage = ref(false);
const usageDialogVisible = ref(false);
const batch = ref<any>(null);
const materialUsages = ref<any[]>([]);

const statusTextMap: Record<string, string> = {
  planned: '已计划', in_progress: '进行中', completed: '已完成', cancelled: '已取消',
};
const statusTypeMap: Record<string, string> = {
  planned: 'info', in_progress: 'primary', completed: 'success', cancelled: 'warning',
};

const usageForm = reactive({ materialId: '', materialBatchId: '', quantity: 1 });

const resetUsageForm = () => {
  usageForm.materialId = '';
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
  if (!usageForm.materialId || !usageForm.materialBatchId) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  addingUsage.value = true;
  try {
    await materialUsageApi.addUsage(batchId, { ...usageForm });
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
    const res: any = await traceApi.exportReport(batchId);
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
