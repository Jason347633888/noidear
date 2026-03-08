<template>
  <div class="step-view">
    <el-form :model="form" label-width="240px" :disabled="disabled">
      <el-divider>七. 新产品危害评估与验证</el-divider>

      <el-form-item label="验证产线（自动带出中试）">
        <el-input :model-value="productionLineDisplay" disabled />
      </el-form-item>

      <el-form-item label="验证时间">
        <el-date-picker v-model="form.verificationDate" type="date" format="YYYY-MM-DD"
          value-format="YYYY-MM-DD" :disabled="disabled" />
      </el-form-item>

      <el-form-item label="现场工艺">
        <el-radio-group v-model="form.onSiteProcess">
          <el-radio value="符合标准">符合标准</el-radio>
          <el-radio value="不符合标准">不符合标准</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 现场验证 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">现场验证</span></template>
        <div class="template-content">
          <p>1、确认原则：食品安全小组组长应组织公司的食品安全小组对烤蛋糕等的加工生产流程图和生产工艺操作描述进行确认，该确认工作必须在危害分析前完成，以后在体系运行遇到危害控制计划的重新评估也必须首先执行该确认工作。</p>
          <p>2、进行确认的方式有：现场询问、观察及进行实际操作以验证工艺流程图和工艺描述的准确性与符合性。同时还可以对照已绘制的加工车间物流图与现有设施设备布局进行确认，确定其中是否存在交叉污染的危害风险。如果存在，就必须对工艺进行调整并再次确认。</p>
          <p>3、实施确认：公司食品安全小组于 <strong>{{ form.verificationDate || '____' }}</strong> 在公司食品安全小组组长的组织下对烤蛋糕/蒸蛋糕等的加工工艺流程图和工艺描述进行了现场确认，结论认为公司编制烤蛋糕/蒸蛋糕的加工工艺流程图和工艺描述符合现场实际的工艺布局，符合现场所执行的工艺操作方法及工艺参数要求。同时在工艺布局和人员、物品流向上已经做到避免交叉污染的危害。</p>
        </div>

        <el-form-item label="潜在危害">
          <el-radio-group v-model="form.potentialHazard">
            <el-radio value="符合标准">符合标准</el-radio>
            <el-radio value="不符合标准">不符合标准</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- 风险是否显著 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">风险是否显著</span></template>
        <el-form-item label="生物危害（沙门氏菌、金黄色葡萄球菌...）">
          <el-radio-group v-model="form.bioHazard">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="化学危害（农药残留、重金属...）">
          <el-radio-group v-model="form.chemHazard">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="物理危害（金属、玻璃、塑料...）">
          <el-radio-group v-model="form.physHazard">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="过敏原（八大过敏原之一）">
          <el-radio-group v-model="form.allergenHazard">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="控制措施">
          <el-radio-group v-model="form.controlMeasure">
            <el-radio value="已具备">已具备</el-radio>
            <el-radio value="待完善">待完善</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- CCP 验证 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">CCP 验证</span></template>
        <el-form-item label="关键限值符合工艺范围">
          <el-checkbox v-model="form.ccpLimitOk" />
        </el-form-item>
        <el-form-item label="明确监控方法、频率、责任人">
          <el-checkbox v-model="form.ccpMonitorOk" />
        </el-form-item>
        <el-form-item label="设备具备纠偏控制">
          <el-checkbox v-model="form.ccpDeviceOk" />
        </el-form-item>
        <el-form-item label="关键岗位人员具有纠偏措施意识">
          <el-checkbox v-model="form.ccpPersonnelOk" />
        </el-form-item>
      </el-card>

      <!-- 审核 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">审核（HACCP 小组）</span></template>
        <ApprovalPanel
          :step-status="stepStatus"
          :approval-comment="form.approvalComment"
          :disabled="disabled"
          @approve="handleApprove"
          @reject="handleReject"
        />
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED'" class="action-bar">
      <el-button @click="emit('saved', { ...form })">暂存草稿</el-button>
      <el-button type="primary" @click="emit('submitted', { ...form })">提交审批</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import ApprovalPanel from './ApprovalPanel.vue';
import dayjs from 'dayjs';

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
  (e: 'approve', comment: string): void;
  (e: 'reject', comment: string): void;
}>();

const form = reactive({
  verificationDate: dayjs().format('YYYY-MM-DD'),
  onSiteProcess: '符合标准',
  potentialHazard: '符合标准',
  bioHazard: '是', chemHazard: '是', physHazard: '是', allergenHazard: '是',
  controlMeasure: '已具备',
  ccpLimitOk: true, ccpMonitorOk: true, ccpDeviceOk: true, ccpPersonnelOk: true,
  approvalComment: '',
});

const productionLineDisplay = computed(() => {
  const step5 = props.allStepsData?.[5] as Record<string, unknown> | undefined;
  return (step5?.productionLine as string) ?? '-';
});

onMounted(() => {
  if (props.modelValue) Object.assign(form, props.modelValue);
});

const handleApprove = (comment: string) => emit('approve', comment);
const handleReject = (comment: string) => emit('reject', comment);
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.template-content p { margin: 12px 0; line-height: 1.8; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
