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
          <span>Step {{ viewStep }} — {{ currentStep?.title }}</span>
          <div class="step-nav">
            <el-button :disabled="viewStep <= 1" @click="viewStep--">上一步</el-button>
            <el-button :disabled="viewStep >= 7" @click="viewStep++">下一步</el-button>
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
        @signed="loadInstance"
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
  { number: 1, title: '新产品开发申请书' },
  { number: 2, title: '新产品开发计划书' },
  { number: 3, title: '研发试验记录' },
  { number: 4, title: '产品开发评审' },
  { number: 5, title: '产品标签信息记录' },
  { number: 6, title: '产品操作规程' },
  { number: 7, title: '产品验证记录' },
];

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
const viewStep = ref(1);

const allStepsData = computed(() => {
  const map: Record<number, Record<string, unknown>> = {};
  for (const sd of stepDataList.value) {
    map[sd.stepNumber] = { ...(sd.data as Record<string, unknown>), approvalInstanceId: sd.approvalInstanceId };
  }
  return map;
});

const activeStepIndex = computed(() => (instance.value?.currentStep ?? 1) - 1);
const currentStep = computed(() => STEPS.find(s => s.number === viewStep.value));
const currentStepComponent = computed(() => stepComponents[viewStep.value - 1]);

const isStepDisabled = computed(() => {
  if (!instance.value) return true;
  if (viewStep.value > instance.value.currentStep) return true;
  const status = getStepStatus(viewStep.value);
  return status === 'APPROVED';
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
    stepDataList.value = res.stepData ?? [];
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
    const submittedStep = viewStep.value;
    await processApi.submitStep(instanceId, { stepNumber: submittedStep, data, saveAsDraft: false });
    await loadInstance();
    // Advance view to next step so user sees the next pending step after submission
    if (submittedStep < STEPS.length) {
      viewStep.value = submittedStep + 1;
    }
    ElMessage.success('提交成功');
  } catch {
    ElMessage.error('提交失败');
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
