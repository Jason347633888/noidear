<template>
  <div class="print-container" v-loading="loading">
    <!-- Print toolbar (hidden on print) -->
    <div class="no-print print-toolbar">
      <h2>{{ instance?.productName || '产品研发流程' }} - 打印预览</h2>
      <div class="toolbar-actions">
        <el-button @click="router.back()">返回</el-button>
        <el-button type="primary" :loading="exporting" @click="exportPdf">导出 PDF</el-button>
      </div>
    </div>

    <!-- 截圖範圍：print-content 以內 -->
    <div class="print-content">
    <div v-for="sd in completedSteps" :key="sd.stepNumber" class="print-page">
      <div class="print-page-header">
        <h3>产品研发流程 - {{ instance?.productName }}</h3>
        <p class="page-meta">
          Step {{ sd.stepNumber }} / 7
          <span v-if="sd.submittedBy"> | 提交人：{{ sd.submittedBy.name }}</span>
          <span v-if="sd.submittedAt"> | 提交时间：{{ formatDate(sd.submittedAt) }}</span>
          <span v-if="sd.approvedBy"> | 审批人：{{ sd.approvedBy.name }}</span>
        </p>
      </div>

      <component
        :is="stepComponents[sd.stepNumber - 1]"
        :instance-id="instanceId"
        :model-value="sd.data as Record<string, unknown>"
        :all-steps-data="allStepsData"
        :disabled="true"
        :step-status="sd.status"
      />
    </div>

    <el-empty v-if="!loading && completedSteps.length === 0" description="暂无已完成步骤" />
    </div><!-- end print-content -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { processApi, type ProcessInstance, type ProcessStepData } from '@/api/process';
import '@/assets/styles/process-print.css';

const stepComponents = [
  defineAsyncComponent(() => import('./Step1.vue')),
  defineAsyncComponent(() => import('./Step2.vue')),
  defineAsyncComponent(() => import('./Step3.vue')),
  defineAsyncComponent(() => import('./Step4.vue')),
  defineAsyncComponent(() => import('./Step5.vue')),
  defineAsyncComponent(() => import('./Step6.vue')),
  defineAsyncComponent(() => import('./Step7.vue')),
];

const route = useRoute();
const router = useRouter();
const instanceId = route.params.id as string;
const instance = ref<ProcessInstance | null>(null);
const stepDataList = ref<ProcessStepData[]>([]);
const loading = ref(false);
const exporting = ref(false);

const completedSteps = computed(() =>
  stepDataList.value
    .filter(sd => ['SUBMITTED', 'APPROVED'].includes(sd.status))
    .sort((a, b) => a.stepNumber - b.stepNumber)
);

const allStepsData = computed(() => {
  const map: Record<number, Record<string, unknown>> = {};
  for (const sd of stepDataList.value) {
    map[sd.stepNumber] = sd.data as Record<string, unknown>;
  }
  return map;
});

const formatDate = (d: string) => new Date(d).toLocaleString('zh-CN');

// 用 html2canvas + jsPDF 截圖匯出，繞過 Chrome PDF 引擎的中文字型問題
const exportPdf = async () => {
  exporting.value = true;
  ElMessage.info('正在生成 PDF，请稍候...');
  await nextTick();
  try {
    const [html2canvas, { jsPDF }] = await Promise.all([
      import('html2canvas').then(m => m.default),
      import('jspdf'),
    ]);

    const content = document.querySelector('.print-content') as HTMLElement;
    if (!content) throw new Error('找不到内容区域');

    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 960,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let y = 0;
    let remaining = imgH;

    while (remaining > 0) {
      pdf.addImage(imgData, 'JPEG', 0, -y, imgW, imgH);
      remaining -= pageH;
      y += pageH;
      if (remaining > 0) pdf.addPage();
    }

    const name = instance.value?.productName || '研发流程';
    pdf.save(`${name}.pdf`);
    ElMessage.success('PDF 已导出');
  } catch (err) {
    ElMessage.error('导出失败，请重试');
    console.error(err);
  } finally {
    exporting.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    const res = await processApi.getInstance(instanceId);
    instance.value = res;
    stepDataList.value = res.stepDataList ?? [];
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.print-container { max-width: 900px; margin: 0 auto; padding: 16px; }
.print-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; padding: 16px; background: #f5f6fa; border-radius: 8px;
}
.toolbar-actions { display: flex; gap: 12px; }
.print-page { margin-bottom: 32px; border: 1px solid #ddd; padding: 24px; border-radius: 4px; }
.print-page-header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
.print-page-header h3 { margin: 0 0 8px; font-size: 16px; }
.page-meta { color: #666; font-size: 13px; margin: 0; }
</style>
