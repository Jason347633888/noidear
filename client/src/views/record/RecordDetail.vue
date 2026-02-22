<template>
  <div class="record-detail" v-loading="loading">
    <el-page-header @back="router.back()" content="记录详情" />

    <el-card class="info-card" v-if="record">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <div class="header-actions">
            <el-tag :type="statusTypeMap[record.status]">
              {{ statusTextMap[record.status] }}
            </el-tag>
            <el-button size="small" @click="handleExportPdf">
              导出 PDF
            </el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="记录ID">{{ record.id }}</el-descriptions-item>
        <el-descriptions-item label="任务模板">
          {{ record.task?.template?.title || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="提交人">{{ record.submitter?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ record.submittedAt ? new Date(record.submittedAt).toLocaleString('zh-CN') : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="审批时间">
          {{ record.approvedAt ? new Date(record.approvedAt).toLocaleString('zh-CN') : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="审批意见">
          {{ record.comment || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="data-card" v-if="record?.dataJson">
      <template #header>
        <span>记录数据</span>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item
          v-for="(value, key) in record.dataJson"
          :key="String(key)"
          :label="String(key)"
        >
          {{ formatValue(value) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="changelog-card" v-if="changeLogs.length > 0">
      <template #header>
        <span>变更历史</span>
      </template>
      <el-timeline>
        <el-timeline-item
          v-for="log in changeLogs"
          :key="log.id"
          :timestamp="new Date(log.changedAt).toLocaleString('zh-CN')"
          placement="top"
        >
          <div class="changelog-item">
            <span class="changelog-field">{{ log.field }}</span>
            <span class="changelog-change">
              <span class="old-value">{{ log.oldValue || '(空)' }}</span>
              <span class="arrow"> -> </span>
              <span class="new-value">{{ log.newValue }}</span>
            </span>
            <span class="changelog-user">操作人：{{ log.changer?.name || '-' }}</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import recordApi, { type RecordChangeLog } from '@/api/record';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const record = ref<any>(null);
const changeLogs = ref<RecordChangeLog[]>([]);

const statusTextMap: Record<string, string> = { draft: '草稿', submitted: '已提交', approved: '已通过', rejected: '已驳回' };
const statusTypeMap: Record<string, string> = { draft: 'info', submitted: 'warning', approved: 'success', rejected: 'danger' };

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const fetchRecord = async () => {
  loading.value = true;
  try {
    const res: any = await recordApi.getRecordById(route.params.id as string);
    record.value = res;
  } catch (error) {
    ElMessage.error('获取记录详情失败');
  } finally {
    loading.value = false;
  }
};

const fetchChangeLogs = async () => {
  try {
    const res: any = await recordApi.getRecordChangeLogs(route.params.id as string);
    changeLogs.value = res;
  } catch (error) {
    // 变更日志可能不存在，忽略
  }
};

const handleExportPdf = async () => {
  try {
    const res: any = await recordApi.exportRecordPdf(route.params.id as string);
    const url = window.URL.createObjectURL(new Blob([res]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `record-${route.params.id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('PDF 导出成功');
  } catch (error) {
    ElMessage.error('PDF 导出失败');
  }
};

onMounted(async () => {
  await fetchRecord();
  await fetchChangeLogs();
});
</script>

<style scoped>
.record-detail { padding: 0; }
.info-card { margin-top: 16px; margin-bottom: 16px; }
.data-card { margin-bottom: 16px; }
.changelog-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.changelog-item { display: flex; flex-direction: column; gap: 4px; }
.changelog-field { font-weight: 600; color: #303133; }
.changelog-change { font-size: 13px; }
.old-value { color: #f56c6c; text-decoration: line-through; }
.arrow { color: #909399; }
.new-value { color: #67c23a; }
.changelog-user { font-size: 12px; color: #909399; }
</style>
