<template>
  <div class="step-view">
    <el-form :model="form" label-width="200px" :disabled="disabled">
      <el-divider>产品操作规程（JL-02）+ 配方及工艺参数（JL-06）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">SOP基本信息</span></template>
        <el-form-item label="产品名称"><el-input :model-value="productName" disabled /></el-form-item>
        <el-form-item label="SOP版本"><el-input v-model="form.sopVersion" placeholder="V1.0" /></el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker v-model="form.effectiveDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="产品线">
          <el-select v-model="form.productLine">
            <el-option value="A线" label="A线" />
            <el-option value="B线" label="B线" />
            <el-option value="C线" label="C线" />
          </el-select>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品配方（JL-06）</span></template>
        <RecipeLineEditor v-model="form.recipeLines" :disabled="disabled" />
        <div style="margin-top:8px; display:flex; gap:24px">
          <el-form-item label="标准批量(kg)">
            <el-input-number v-model="form.batchSize" :min="0" :precision="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="出品率(%)">
            <el-input-number v-model="form.yieldRate" :min="0" :max="100" :precision="1" controls-position="right" />
          </el-form-item>
        </div>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">工艺参数（JL-06）</span></template>
        <el-form-item label="炉速">
          <el-input v-model="form.ovenSpeed" placeholder="如：450mm/min" />
        </el-form-item>
        <el-form-item label="蛋黄SG">
          <el-input v-model="form.yolkSG" placeholder="如：0.38~0.42" />
        </el-form-item>
        <el-form-item label="蛋清SG">
          <el-input v-model="form.whiteSG" placeholder="如：0.14~0.16" />
        </el-form-item>
        <el-form-item label="混合后SG">
          <el-input v-model="form.mixedSG" placeholder="如：0.28~0.32" />
        </el-form-item>
        <el-form-item label="满杯比重(g)">
          <el-input v-model="form.cupWeight" placeholder="如：165~175" />
        </el-form-item>
        <el-form-item label="下料机注浆重量(g)">
          <el-input v-model="form.fillingWeight" placeholder="如：80~85" />
        </el-form-item>
        <el-form-item label="出炉口重量(g)">
          <el-input v-model="form.exitWeight" placeholder="如：72~78" />
        </el-form-item>
        <el-form-item label="出炉温度(°C)">
          <el-input v-model="form.exitTemp" placeholder="如：≥95" />
        </el-form-item>
        <el-form-item label="包装温度(°C)">
          <el-input v-model="form.packagingTemp" placeholder="如：25~35" />
        </el-form-item>
        <el-form-item label="炉温备注">
          <el-input v-model="form.ovenTempNote" type="textarea" :rows="3" placeholder="各区炉温范围（面火/底火）" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">生产工艺流程</span></template>
        <el-form-item label="工艺流程描述">
          <el-input v-model="form.productionFlow" type="textarea" :rows="5" placeholder="按工序顺序描述生产流程" />
        </el-form-item>
        <el-form-item label="关键控制点(CCP)">
          <el-input v-model="form.criticalControlPoints" type="textarea" :rows="3" placeholder="CCP1: 金探，限值Fe≤2mm；CCP2: 烘烤，中心温度≥95°C" />
        </el-form-item>
        <el-form-item label="过敏原控制措施">
          <el-input v-model="form.allergenControl" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">品质部 + 制造部审核</span></template>
        <DeptSignoffPanel
          v-if="stepStatus === 'SUBMITTED'"
          :instance-id="instanceId"
          :step-number="6"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">品质部+制造部审核完成，配方已写入产品台账</el-text>
        <el-text v-else type="info" size="small">提交后由品质部和制造部审核</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交审核</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import DeptSignoffPanel from '@/components/process/DeptSignoffPanel.vue';
import RecipeLineEditor from '@/components/process/RecipeLineEditor.vue';
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

const rawMatsFromStep2 = computed((): RecipeLine[] => {
  const s2 = props.allStepsData?.[2] as any;
  return (s2?.rawMaterials ?? []).map((m: any): RecipeLine => ({
    materialId: m.id,
    materialCode: m.materialCode,
    materialName: m.name,
    qtyPerBatch: 0,
    unit: 'kg',
  }));
});

const form = reactive({
  sopVersion: 'V1.0',
  effectiveDate: dayjs().format('YYYY-MM-DD'),
  productLine: 'A线',
  recipeLines: [] as RecipeLine[],
  batchSize: 0,
  yieldRate: 0,
  ovenSpeed: '',
  yolkSG: '',
  whiteSG: '',
  mixedSG: '',
  cupWeight: '',
  fillingWeight: '',
  exitWeight: '',
  exitTemp: '',
  packagingTemp: '',
  ovenTempNote: '',
  productionFlow: '',
  criticalControlPoints: '',
  allergenControl: '',
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
  if (form.recipeLines.length === 0 && rawMatsFromStep2.value.length > 0) {
    form.recipeLines = rawMatsFromStep2.value;
  }
});

const getFormData = () => ({ ...form, recipeLines: form.recipeLines.map(r => ({ ...r })) });

const handleSubmit = () => {
  if (form.recipeLines.length === 0) { ElMessage.warning('请填写产品配方'); return; }
  if (!form.productionFlow.trim()) { ElMessage.warning('请填写生产工艺流程'); return; }
  emit('submitted', getFormData());
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
