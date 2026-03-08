<template>
  <div class="step-view">
    <el-form :model="form" label-width="160px" :disabled="disabled">
      <el-divider>五. 验证评审（中试）--制造部</el-divider>

      <el-form-item label="日期">
        <el-input :model-value="form.date" disabled />
      </el-form-item>

      <el-form-item label="生产线" prop="productionLine">
        <el-select v-model="form.productionLine" placeholder="请选择生产线">
          <el-option v-for="l in productionLines" :key="l" :label="l" :value="l" />
        </el-select>
      </el-form-item>

      <el-form-item label="产量（kg）">
        <el-input-number v-model="form.output" :min="0" controls-position="right" />
      </el-form-item>

      <el-form-item label="试验记录">
        <el-input v-model="form.trialRecord" type="textarea" :rows="3" />
      </el-form-item>

      <el-form-item label="工艺参数" class="full-width">
        <ProcessParams
          v-model="form.processParams"
          :process-type="processType"
          :disabled="disabled"
        />
      </el-form-item>

      <!-- 危害控制点静态内容 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">危害控制点（CCP/OPRP 监控计划表）</span></template>
        <div class="ccp-table">
          <el-table :data="ccpData" border size="small">
            <el-table-column prop="point" label="控制点" width="80" />
            <el-table-column prop="hazard" label="危害" min-width="120" />
            <el-table-column prop="limit" label="关键限值" min-width="120" />
            <el-table-column prop="monitor" label="监控方法" min-width="120" />
            <el-table-column prop="freq" label="频率" width="80" />
            <el-table-column prop="person" label="责任人" width="80" />
          </el-table>
        </div>
      </el-card>

      <el-form-item label="验证结论">
        <el-input v-model="form.verificationConclusion" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>

    <div v-if="!disabled" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="emit('submitted', getFormData())">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import ProcessParams from '@/components/process/ProcessParams.vue';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
}>();

const productionLines = [
  '烤蛋糕1号线', '烤蛋糕2号线', '烤蛋糕3号线',
  '蒸蛋糕1号线', '蒸蛋糕2号线', '蒸蛋糕3号线', '蒸蛋糕4号线', '蒸蛋糕5号线',
];

const ccpData = [
  { point: 'CCP1', hazard: '配料异物', limit: '无金属异物', monitor: '金属探测仪', freq: '每批次', person: '配料员' },
  { point: 'CCP2', hazard: '烘烤不足', limit: '中心温度≥95°C', monitor: '温度计', freq: '每班次', person: '烘烤员' },
  { point: 'CCP3', hazard: '金属异物', limit: 'Fe≤2.0mm', monitor: '金检机', freq: '连续', person: '质检员' },
  { point: 'OPRP1', hazard: '原料污染', limit: '合格证明文件', monitor: '进货检验', freq: '每批次', person: '采购员' },
  { point: 'OPRP2', hazard: '异物混入', limit: '过滤网完好', monitor: '目视检查', freq: '每班', person: '操作员' },
  { point: 'OPRP3', hazard: '包装污染', limit: '消毒合格', monitor: '浓度检测', freq: '每批次', person: '品质员' },
];

const form = reactive({
  date: dayjs().format('YYYY-MM-DD'),
  productionLine: '',
  output: 0,
  trialRecord: '',
  processParams: {} as Record<string, unknown>,
  verificationConclusion: '',
});

const processType = computed(() => {
  const step1 = props.allStepsData?.[1] as Record<string, unknown> | undefined;
  return (step1?.processType as string[]) ?? [];
});

onMounted(() => {
  if (props.modelValue) Object.assign(form, props.modelValue);
});

const getFormData = () => ({ ...form });
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.ccp-table { overflow-x: auto; }
.full-width :deep(.el-form-item__content) { display: block; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
