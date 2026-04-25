<template>
  <div class="process-detail" v-loading="loading">
    <el-page-header @back="router.push('/process')" class="page-header">
      <template #content>
        <span>{{ instance?.productName || '产品研发流程' }}</span>
        <el-tag :type="statusType" size="small" style="margin-left:12px">{{ statusText }}</el-tag>
      </template>
      <template #extra>
        <el-button size="small" @click="router.push(`/process/instances/${instanceId}/print`)">
          打印/导出
        </el-button>
      </template>
    </el-page-header>

    <el-steps :active="activeStepIndex" class="steps-bar" align-center finish-status="success">
      <el-step v-for="s in STEPS" :key="s.number" :title="s.title" />
    </el-steps>

    <el-card class="step-card">
      <template #header>
        <div class="step-header">
          <span>{{ currentStep?.title }}</span>
          <div class="step-nav">
            <el-button :disabled="viewStep <= 1" @click="viewStep--">上一步</el-button>
            <el-button :disabled="viewStep >= 9" @click="viewStep++">下一步</el-button>
          </div>
        </div>
      </template>

      <component
        :is="currentStepComponent"
        :instance-id="instanceId"
        :model-value="allStepsData[viewStep]"
        :all-steps-data="allStepsData"
        :disabled="isStepDisabled"
        :step-status="getStepStatus(viewStep)"
        @saved="(data: Record<string, unknown>) => handleSave(data)"
        @submitted="(data: Record<string, unknown>) => handleSubmit(data)"
        @approve="(comment: string) => handleApprove(comment)"
        @reject="(comment: string) => handleReject(comment)"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { processApi, type ProcessInstance, type ProcessStepData } from '@/api/process';

const STEPS = [
  { number: 1, title: 'Step 1 立项申请' },
  { number: 2, title: 'Step 2 设计输入' },
  { number: 3, title: 'Step 3 风险识别' },
  { number: 4, title: 'Step 4 小试记录' },
  { number: 5, title: 'Step 5 中试验证' },
  { number: 6, title: 'Step 6 验证评审' },
  { number: 7, title: 'Step 7 危害评估' },
  { number: 8, title: 'Step 8 放行审批' },
  { number: 9, title: 'Step 9 开发输出' },
];

const stepComponents = [
  defineAsyncComponent(() => import('./Step1.vue')),
  defineAsyncComponent(() => import('./Step2.vue')),
  defineAsyncComponent(() => import('./Step3.vue')),
  defineAsyncComponent(() => import('./Step4.vue')),
  defineAsyncComponent(() => import('./Step5.vue')),
  defineAsyncComponent(() => import('./Step6.vue')),
  defineAsyncComponent(() => import('./Step7.vue')),
  defineAsyncComponent(() => import('./Step8.vue')),
  defineAsyncComponent(() => import('./Step9.vue')),
];

const route = useRoute();
const router = useRouter();
const instanceId = route.params.id as string;

const instance = ref<ProcessInstance | null>(null);
const stepDataList = ref<ProcessStepData[]>([]);
const loading = ref(false);
const viewStep = ref(1);

const allStepsData = computed(() => {
  const map: Record<number, Record<string, unknown>> = {};
  for (const sd of stepDataList.value) {
    map[sd.stepNumber] = sd.data as Record<string, unknown>;
  }
  return map;
});

const activeStepIndex = computed(() => (instance.value?.currentStep ?? 1) - 1);
const currentStep = computed(() => STEPS.find(s => s.number === viewStep.value));
const currentStepComponent = computed(() => stepComponents[viewStep.value - 1]);

const isStepDisabled = computed(() => {
  if (!instance.value) return true;
  return viewStep.value > instance.value.currentStep;
});

const statusType = computed(() => {
  const s = instance.value?.status;
  const map: Record<string, string> = { DRAFT: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', REJECTED: 'danger' };
  return map[s ?? ''] ?? 'info';
});

const statusText = computed(() => {
  const s = instance.value?.status;
  const map: Record<string, string> = { DRAFT: '草稿', IN_PROGRESS: '进行中', COMPLETED: '已完成', REJECTED: '已驳回' };
  return map[s ?? ''] ?? '';
});

const getStepStatus = (stepNum: number) => {
  const sd = stepDataList.value.find(s => s.stepNumber === stepNum);
  return sd?.status;
};

const loadInstance = async () => {
  loading.value = true;
  try {
    const res = await processApi.getInstance(instanceId);
    instance.value = res;
    stepDataList.value = res.stepDataList ?? [];
    viewStep.value = res.currentStep ?? 1;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSave = async (data: Record<string, unknown>) => {
  try {
    await processApi.submitStep(instanceId, { stepNumber: viewStep.value, data, saveAsDraft: true });
    await loadInstance();
    ElMessage.success('已暂存');
  } catch {
    ElMessage.error('暂存失败');
  }
};

const handleSubmit = async (data: Record<string, unknown>) => {
  try {
    await processApi.submitStep(instanceId, { stepNumber: viewStep.value, data, saveAsDraft: false });
    await loadInstance();
    ElMessage.success('提交成功');
  } catch {
    ElMessage.error('提交失败');
  }
};

const handleApprove = async (comment: string) => {
  try {
    await processApi.approveStep(instanceId, { stepNumber: viewStep.value, action: 'approve', comment });
    await loadInstance();
    ElMessage.success('审批通过');
  } catch {
    ElMessage.error('审批失败');
  }
};

const handleReject = async (comment: string) => {
  try {
    await processApi.approveStep(instanceId, { stepNumber: viewStep.value, action: 'reject', comment });
    await loadInstance();
    ElMessage.warning('已驳回');
  } catch {
    ElMessage.error('驳回失败');
  }
};

onMounted(loadInstance);
</script>

<style scoped>
.process-detail { padding: 16px; }
.page-header { margin-bottom: 16px; }
.steps-bar { margin-bottom: 20px; overflow-x: auto; }
.step-card { min-height: 400px; }
.step-header { display: flex; justify-content: space-between; align-items: center; }
.step-nav { display: flex; gap: 8px; }
</style>
