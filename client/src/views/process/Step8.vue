<template>
  <div class="step-view">
    <el-form :model="form" label-width="320px" :disabled="disabled">
      <el-divider>八. 开发评审/新产品放行审批</el-divider>

      <!-- 第一组 checkbox -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">评审项目（一）</span></template>
        <el-form-item label="原辅料采购的可行性">
          <el-checkbox v-model="form.c1" /></el-form-item>
        <el-form-item label="产品标准的符合性">
          <el-checkbox v-model="form.c2" /></el-form-item>
        <el-form-item label="产品批产性能的稳定性">
          <el-checkbox v-model="form.c3" /></el-form-item>
        <el-form-item label="产品特性">
          <el-checkbox v-model="form.c4" /></el-form-item>
        <el-form-item label="产品检测/试验记录的完整性和可追溯性">
          <el-checkbox v-model="form.c5" /></el-form-item>
        <el-form-item label="产品符合性">
          <el-checkbox v-model="form.c6" /></el-form-item>
        <el-form-item label="产品过敏原的识别和控制">
          <el-checkbox v-model="form.c7" /></el-form-item>
      </el-card>

      <!-- 第二组 checkbox -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">评审项目（二）关键工序</span></template>
        <el-form-item label="产品制作、生产规范及工艺文件的完整性与可追溯性">
          <el-checkbox v-model="form.c8" /></el-form-item>
        <el-form-item label="过程监控记录的完整性和可追溯性">
          <el-checkbox v-model="form.c9" /></el-form-item>
        <el-form-item label="批量生产能力和质量保证能力评价">
          <el-checkbox v-model="form.c10" /></el-form-item>
        <el-form-item label="设计更改、让步使用、器材代用有效性检查">
          <el-checkbox v-model="form.c11" /></el-form-item>
        <el-form-item label="批量生产 - 质量问题分析处理情况评价">
          <el-checkbox v-model="form.c12" /></el-form-item>
      </el-card>

      <!-- 各项确认 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">确认项目</span></template>
        <el-form-item v-for="item in confirmItems" :key="item.key" :label="item.label">
          <el-radio-group v-model="(form as any)[item.key]">
            <el-radio v-for="opt in item.options" :key="opt" :value="opt">{{ opt }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- 审核 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">审核（HACCP 小组）</span></template>
        <ApprovalPanel
          :step-status="stepStatus"
          :approval-comment="form.approvalComment"
          :disabled="disabled"
          @approve="$emit('approve', $event)"
          @reject="$emit('reject', $event)"
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
import { reactive, onMounted } from 'vue';
import ApprovalPanel from './ApprovalPanel.vue';

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

const confirmItems = [
  { key: 'formulaConfirm', label: '配方确认', options: ['已确认', '未确认'] },
  { key: 'processConfirm', label: '工艺确认', options: ['已确认', '未确认'] },
  { key: 'standardConfirm', label: '标准确认', options: ['已确认', '未确认'] },
  { key: 'shelfLifeVerify', label: '保质期验证', options: ['完成', '未完成'] },
  { key: 'inspectionReport', label: '检验报告', options: ['合格', '不合格'] },
  { key: 'hazardAssessment', label: '危害评估', options: ['完成', '未完成'] },
  { key: 'labelConfirm', label: '标签', options: ['合规', '不合规'] },
  { key: 'packagingConfirm', label: '包装材料', options: ['合格', '不合格'] },
  { key: 'conclusion', label: '结论', options: ['同意放行', '不同意放行'] },
];

const form = reactive({
  c1: true, c2: true, c3: true, c4: true, c5: true, c6: true, c7: true,
  c8: true, c9: true, c10: true, c11: true, c12: true,
  formulaConfirm: '已确认', processConfirm: '已确认', standardConfirm: '已确认',
  shelfLifeVerify: '完成', inspectionReport: '合格', hazardAssessment: '完成',
  labelConfirm: '合规', packagingConfirm: '合格', conclusion: '同意放行',
  approvalComment: '',
});

onMounted(() => {
  if (props.modelValue) Object.assign(form, props.modelValue);
});
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
