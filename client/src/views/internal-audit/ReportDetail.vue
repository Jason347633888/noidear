<template>
  <div class="report-detail">
    <el-card v-loading="loading">
      <template #header>
        <div class="header">
          <div class="header-left">
            <el-button link @click="router.back()">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
            <h2>内审报告详情</h2>
          </div>
          <div v-if="report?.pdfUrl" class="header-right">
            <el-button type="primary" @click="handleDownload">
              <el-icon><Download /></el-icon>
              下载 PDF
            </el-button>
          </div>
        </div>
      </template>

      <template v-if="report">
        <el-descriptions title="报告基本信息" :column="3" border class="info-section">
          <el-descriptions-item label="内审标题">
            {{ report.plan?.title || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="内审类型">
            <el-tag v-if="report.plan?.type === 'quarterly'" type="success">季度内审</el-tag>
            <el-tag v-else-if="report.plan?.type === 'semiannual'" type="warning">半年内审</el-tag>
            <el-tag v-else-if="report.plan?.type === 'annual'" type="danger">年度内审</el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="生成时间">
            {{ formatDateTime(report.generatedAt || report.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="审核时间">
            <span v-if="report.plan?.startDate">
              {{ formatDate(report.plan.startDate) }} ~ {{ formatDate(report.plan.endDate) }}
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="审核文档总数">
            {{ report.totalDocuments }}
          </el-descriptions-item>
          <el-descriptions-item label="符合 / 不符合">
            <el-tag type="success">符合 {{ report.compliantCount }}</el-tag>
            &nbsp;
            <el-tag type="danger">不符合 {{ report.nonCompliantCount }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="compliance-section">
          <el-statistic
            title="合规率"
            :value="complianceRate"
            suffix="%"
            :value-style="{ color: complianceRate >= 80 ? '#67c23a' : '#f56c6c' }"
          />
        </div>

        <template v-if="report.pdfUrl">
          <el-divider>PDF 报告预览</el-divider>
          <div class="pdf-container">
            <iframe :src="report.pdfUrl" class="pdf-iframe" title="内审报告 PDF" />
          </div>
        </template>

        <el-empty v-if="!report.pdfUrl" description="暂无 PDF 报告，请联系管理员生成" />
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Download } from '@element-plus/icons-vue';
import { getReport, type AuditReport } from '@/api/internal-audit/report';

const route = useRoute();
const router = useRouter();
const reportId = route.params.id as string;

const loading = ref(false);
const report = ref<AuditReport | null>(null);

const complianceRate = computed(() => {
  if (!report.value || report.value.totalDocuments === 0) return 0;
  return Math.round((report.value.compliantCount / report.value.totalDocuments) * 100);
});

const fetchData = async () => {
  loading.value = true;
  try {
    report.value = await getReport(reportId);
  } catch (error: any) {
    ElMessage.error(error.message || '获取报告详情失败');
  } finally {
    loading.value = false;
  }
};

const handleDownload = () => {
  if (report.value?.pdfUrl) {
    const link = document.createElement('a');
    link.href = report.value.pdfUrl;
    link.download = `内审报告_${report.value.plan?.title || report.value.id}.pdf`;
    link.target = '_blank';
    link.click();
  }
};

const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.report-detail {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h2 {
  margin: 0;
}

.info-section {
  margin-bottom: 24px;
}

.compliance-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  margin-bottom: 24px;
}

.pdf-container {
  width: 100%;
  height: 700px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
