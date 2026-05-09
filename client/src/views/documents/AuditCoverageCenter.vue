<template>
  <div class="audit-coverage-center">
    <PageHeaderBlock title="审核覆盖中心" eyebrow="文控与审批" />
    <div class="toolbar">
      <el-date-picker v-model="period" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" />
      <el-button type="primary" @click="load">查询</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="document.number" label="编号" width="160" />
      <el-table-column prop="document.title" label="文件" min-width="240" />
      <el-table-column prop="coverageStatus" label="覆盖状态" width="140" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const period = ref<[Date, Date] | null>(null);
const rows = ref<any[]>([]);
const loading = ref(false);

const load = async () => {
  if (!period.value) {
    ElMessage.error('请选择审核周期');
    return;
  }
  loading.value = true;
  try {
    rows.value = await documentOperationsApi.getAuditCoverage({
      periodStart: period.value[0].toISOString(),
      periodEnd: period.value[1].toISOString(),
    }) as any[];
  } catch {
    ElMessage.error('获取审核覆盖失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.audit-coverage-center {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 10px;
}
</style>
