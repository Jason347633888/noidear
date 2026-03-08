<template>
  <div class="step-view">
    <el-form :model="form" label-width="280px" :disabled="disabled">
      <el-divider>六. 验证评审</el-divider>

      <!-- 原料验证 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">原料验证</span></template>
        <el-form-item label="原料生产商三证合一">
          <el-checkbox v-model="form.cert3in1" />
        </el-form-item>
        <el-form-item label="拥有第三方检测标准">
          <el-checkbox v-model="form.thirdPartyTest" />
        </el-form-item>
        <el-form-item label="批次检验报告">
          <el-checkbox v-model="form.batchReport" />
        </el-form-item>
        <el-form-item label="原料潜在危害分析（生物/化学/物理/过敏原/食品欺诈）">
          <el-checkbox v-model="form.hazardAnalysis" />
        </el-form-item>
        <el-form-item label="原料符合执行标准、验收项目">
          <el-checkbox v-model="form.materialCompliant" />
        </el-form-item>
        <el-form-item label="结论：原辅料的质量与可靠性">
          <el-radio-group v-model="form.materialConclusion">
            <el-radio value="可靠">可靠</el-radio>
            <el-radio value="不可靠">不可靠</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- 产品理化及安全性检验 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品理化及安全性检验</span></template>
        <el-form-item label="产品理化及安全性检验">
          <el-radio-group v-model="form.physicoChemical">
            <el-radio value="符合理化要求(GRSS/PZ-JL-29)">符合理化要求(GRSS/PZ-JL-29)</el-radio>
            <el-radio value="不符合">不符合</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="保质期测试">
          <el-radio-group v-model="form.shelfLifeTest">
            <el-radio value="符合保质期要求(GRSS/PZ-JL-62)">符合保质期要求(GRSS/PZ-JL-62)</el-radio>
            <el-radio value="不符合">不符合</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <!-- 其他检验项目 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">其他检验项目</span></template>
        <el-form-item label="车间食品接触材料">
          <span class="static-text">符合 GB4806</span>
        </el-form-item>
        <el-form-item label="成品检验">
          <el-radio-group v-model="form.finalInspection">
            <el-radio value="合格">合格</el-radio>
            <el-radio value="不合格">不合格</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="检验方式">
          <el-radio-group v-model="form.inspectionMethod">
            <el-radio value="型式检验">型式检验</el-radio>
            <el-radio value="出厂检验">出厂检验</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>
    </el-form>

    <div v-if="!disabled" class="action-bar">
      <el-button @click="emit('saved', { ...form })">暂存草稿</el-button>
      <el-button type="primary" @click="emit('submitted', { ...form })">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';

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

const form = reactive({
  cert3in1: true,
  thirdPartyTest: true,
  batchReport: true,
  hazardAnalysis: true,
  materialCompliant: true,
  materialConclusion: '可靠',
  physicoChemical: '符合理化要求(GRSS/PZ-JL-29)',
  shelfLifeTest: '符合保质期要求(GRSS/PZ-JL-62)',
  finalInspection: '合格',
  inspectionMethod: '型式检验',
});

onMounted(() => {
  if (props.modelValue) Object.assign(form, props.modelValue);
});
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.static-text { color: var(--el-text-color-secondary); }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
