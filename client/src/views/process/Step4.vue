<template>
  <div class="step-view">
    <el-form :model="form" label-width="320px" :disabled="disabled">
      <el-divider>产品开发评审（JL-01）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">基本信息</span></template>
        <el-form-item label="产品名称"><el-input :model-value="productName" disabled /></el-form-item>
        <el-form-item label="项目负责人"><el-input v-model="form.projectManager" /></el-form-item>
        <el-form-item label="评审日期">
          <el-date-picker v-model="form.reviewDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="评审阶段">
          <el-radio-group v-model="form.reviewStage">
            <el-radio value="小试评审">小试评审</el-radio>
            <el-radio value="中试评审">中试评审</el-radio>
            <el-radio value="输出评审">输出评审</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">评审项目（一）</span></template>
        <el-form-item v-for="item in reviewItems1" :key="item.key" :label="item.label">
          <el-radio-group v-model="(form as any)[item.key]">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">评审项目（二）关键工序</span></template>
        <el-form-item v-for="item in reviewItems2" :key="item.key" :label="item.label">
          <el-radio-group v-model="(form as any)[item.key]">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">评审意见及结论</span></template>
        <el-form-item label="评审意见及结论">
          <el-input v-model="form.reviewOpinionConclusion" type="textarea" :rows="4" placeholder="须含量产结论与建议" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">5部门会签</span></template>
        <ApprovalTaskPanel
          v-if="stepStatus === 'SUBMITTED'"
          :approval-instance-id="(modelValue as any)?.approvalInstanceId"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">5部门会签完成</el-text>
        <el-text v-else type="info" size="small">提交后由5部门依次签署</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', { ...form })">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交评审</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import ApprovalTaskPanel from '@/components/approval/ApprovalTaskPanel.vue';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
  (e: 'signed'): void;
}>();

const productName = computed(() => (props.allStepsData?.[1] as any)?.productName ?? '-');

const reviewItems1 = [
  { key: 'procurementFeasibility', label: '原辅料采购的可行性' },
  { key: 'standardCompliance', label: '产品标准的符合性' },
  { key: 'batchStability', label: '产品批产性能的稳定性' },
  { key: 'productCharacteristics', label: '产品特性' },
  { key: 'inspectionTraceability', label: '产品检测/试验记录的完整性和可追溯性' },
  { key: 'reVerificationCompliance', label: '产品符合性' },
  { key: 'allergenControl', label: '产品过敏原的识别和控制' },
];

const reviewItems2 = [
  { key: 'processDocTraceability', label: '产品制作、生产规范及工艺文件的完整性与可追溯性' },
  { key: 'processMonitorTraceability', label: '过程监控记录的完整性和可追溯性' },
  { key: 'batchProductionCapacity', label: '批量生产能力和质量保证能力评价' },
  { key: 'designChangeEffectiveness', label: '设计更改、让步使用、器材代用有效性检查' },
  { key: 'trialQualityIssueEvaluation', label: '试制/试验过程中质量问题分析处理情况评价' },
];

const form = reactive({
  projectManager: '',
  reviewDate: dayjs().format('YYYY-MM-DD'),
  reviewStage: '小试评审',
  procurementFeasibility: '是', standardCompliance: '是', batchStability: '是',
  productCharacteristics: '是', inspectionTraceability: '是', reVerificationCompliance: '是',
  allergenControl: '是', processDocTraceability: '是', processMonitorTraceability: '是',
  batchProductionCapacity: '是', designChangeEffectiveness: '是', trialQualityIssueEvaluation: '是',
  reviewOpinionConclusion: '',
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
});

const handleSubmit = () => {
  if (!form.reviewOpinionConclusion.trim()) { ElMessage.warning('请填写评审意见及结论'); return; }
  emit('submitted', { ...form });
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
