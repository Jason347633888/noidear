<template>
  <div class="step-view">
    <el-form :model="form" label-width="200px" :disabled="disabled">
      <el-divider>产品验证记录（JL-07）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">试生产基本信息</span></template>
        <el-form-item label="产品名称"><el-input :model-value="productName" disabled /></el-form-item>
        <el-form-item label="项目负责人"><el-input v-model="form.projectManager" /></el-form-item>
        <el-form-item label="试生产日期">
          <el-date-picker v-model="form.trialProductionDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="验证阶段">
          <el-radio-group v-model="form.verificationStage">
            <el-radio value="小试">小试</el-radio>
            <el-radio value="中试">中试</el-radio>
            <el-radio value="大试">大试</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="试生产批次号"><el-input v-model="form.batchNumber" /></el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">实际使用配方（来自Step6，只读）</span></template>
        <el-table :data="recipeFromStep6" border size="small">
          <el-table-column type="index" label="序号" width="55" />
          <el-table-column label="物料编码" prop="materialCode" width="130" />
          <el-table-column label="物料名称" prop="materialName" min-width="160" />
          <el-table-column label="用量(kg/批)" prop="qtyPerBatch" width="120" />
          <el-table-column label="单位" prop="unit" width="80" />
        </el-table>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">原辅料验证</span></template>
        <el-form-item label="原料生产商三证合一"><el-checkbox v-model="form.supplierLicenseVerified" /></el-form-item>
        <el-form-item label="拥有第三方检测标准"><el-checkbox v-model="form.thirdPartyStandard" /></el-form-item>
        <el-form-item label="批次检验报告"><el-checkbox v-model="form.batchInspectionReport" /></el-form-item>
        <el-form-item label="原辅料可靠性结论">
          <el-radio-group v-model="form.materialReliabilityConclusion">
            <el-radio value="可靠">可靠</el-radio>
            <el-radio value="不可靠">不可靠</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品理化及安全性检验</span></template>
        <el-form-item label="理化及安全性检验">
          <el-radio-group v-model="form.safetyInspectionConclusion">
            <el-radio value="符合标准">符合标准</el-radio>
            <el-radio value="不符合标准">不符合标准</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="生产中潜在危害">
          <el-input v-model="form.potentialHazard" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="控制措施">
          <el-input v-model="form.controlMeasure" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="储运测试结果（必要时）">
          <el-input v-model="form.storageTransportTest" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="顾客试吃意见（必要时）">
          <el-input v-model="form.customerFeedback" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">验证结论</span></template>
        <el-form-item label="验证结论" prop="verificationConclusion">
          <el-radio-group v-model="form.verificationConclusion">
            <el-radio value="合格">合格（可量产）</el-radio>
            <el-radio value="不合格">不合格（需重新研发）</el-radio>
            <el-radio value="需修改">需修改后再验证</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="验证日期">
          <el-date-picker v-model="form.verificationDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">3人会签（制造部 + 品质部 + 食品安全组长）</span></template>
        <ApprovalTaskPanel
          v-if="stepStatus === 'SUBMITTED'"
          :approval-instance-id="(modelValue as any)?.approvalInstanceId"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">食品安全组长已批准，产品正式激活</el-text>
        <el-text v-else type="info" size="small">提交后由制造部、品质部、食品安全小组长依次签署</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', { ...form })">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交验证</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import ApprovalTaskPanel from '@/components/approval/ApprovalTaskPanel.vue';
import type { RecipeLine } from '@/api/process';

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
const recipeFromStep6 = computed((): RecipeLine[] => {
  const s6 = props.allStepsData?.[6] as any;
  return s6?.recipeLines ?? [];
});

const form = reactive({
  projectManager: '',
  trialProductionDate: dayjs().format('YYYY-MM-DD'),
  verificationStage: '中试',
  batchNumber: '',
  supplierLicenseVerified: true,
  thirdPartyStandard: true,
  batchInspectionReport: true,
  materialReliabilityConclusion: '可靠',
  safetyInspectionConclusion: '符合标准',
  potentialHazard: '',
  controlMeasure: '',
  storageTransportTest: '',
  customerFeedback: '',
  verificationConclusion: '',
  verificationDate: dayjs().format('YYYY-MM-DD'),
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
});

const handleSubmit = () => {
  if (!form.verificationConclusion) { ElMessage.warning('请选择验证结论'); return; }
  if (!form.batchNumber.trim()) { ElMessage.warning('请填写试生产批次号'); return; }
  emit('submitted', { ...form });
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
