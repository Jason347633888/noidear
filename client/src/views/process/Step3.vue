<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="160px" :disabled="disabled">
      <el-divider>研发试验记录（JL-11）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">区块一：新产品制作实验</span></template>
        <el-form-item label="产品名称">
          <el-input :model-value="productName" disabled />
        </el-form-item>
        <el-form-item label="试验日期" prop="experimentDate">
          <el-date-picker v-model="form.experimentDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="实验目的">
          <el-input v-model="form.experimentPurpose" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="实验材料（配料）">
          <el-table :data="form.experimentMaterials" border size="small" style="width:100%">
            <el-table-column type="index" label="序号" width="55" />
            <el-table-column label="物料名称" prop="name" min-width="160" />
            <el-table-column label="用量" width="120">
              <template #default="{ row }">
                <el-input v-if="!disabled" v-model="row.qty" size="small" placeholder="如100g" />
                <span v-else>{{ row.qty }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
        <el-form-item label="配方及工艺">
          <el-input v-model="form.formulaAndProcess" type="textarea" :rows="4" placeholder="描述配方比例和制作工艺步骤" />
        </el-form-item>
        <el-form-item label="实验参数">
          <el-input v-model="form.experimentParameters" type="textarea" :rows="3" placeholder="温度、时间、转速等关键参数" />
        </el-form-item>
        <el-form-item label="生产记录">
          <el-radio-group v-model="form.productionStatus">
            <el-radio value="正常">正常</el-radio>
            <el-radio value="异常">异常</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.productionStatus === '异常'" label="异常说明">
          <el-input v-model="form.productionAbnormalNote" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="样品记录">
          <el-radio-group v-model="form.sampleStatus">
            <el-radio value="正常">正常</el-radio>
            <el-radio value="异常">异常</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.sampleStatus === '异常'" label="样品异常说明">
          <el-input v-model="form.sampleAbnormalNote" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">区块二：保质期实验</span></template>
        <el-form-item label="保质期试验日期">
          <el-date-picker v-model="form.shelfLifeDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="实验目的">
          <el-input v-model="form.shelfLifePurpose" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="储存条件">
          <el-select v-model="form.storageCondition">
            <el-option value="常温库（25°C）" label="常温库（25°C）" />
            <el-option value="阴凉库（≤20°C）" label="阴凉库（≤20°C）" />
            <el-option value="高温高湿加速" label="高温高湿加速" />
          </el-select>
        </el-form-item>
        <el-form-item label="检测结果">
          <el-radio-group v-model="form.inspectionResult">
            <el-radio value="符合">符合</el-radio>
            <el-radio value="不符合">不符合</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数据分析">
          <el-input v-model="form.dataAnalysis" type="textarea" :rows="3" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">结论</span></template>
        <el-form-item label="结论与建议" prop="trialConclusion" :rules="[{ required: true, message: '请填写结论' }]">
          <el-radio-group v-model="form.trialConclusion">
            <el-radio value="通过">通过（可进入下一阶段）</el-radio>
            <el-radio value="需改进">需改进（重新试验）</el-radio>
            <el-radio value="终止">终止项目</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="改进说明" v-if="form.trialConclusion !== '通过'">
          <el-input v-model="form.conclusionNote" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
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
}>();

const formRef = ref();

const productName = computed(() => (props.allStepsData?.[1] as any)?.productName ?? '-');

const rawMatsFromStep2 = computed(() => {
  const s2 = props.allStepsData?.[2] as any;
  return (s2?.rawMaterials ?? []).map((m: any) => ({ name: m.name, qty: '' }));
});

const form = reactive({
  experimentDate: dayjs().format('YYYY-MM-DD'),
  experimentPurpose: '',
  experimentMaterials: [] as { name: string; qty: string }[],
  formulaAndProcess: '',
  experimentParameters: '',
  productionStatus: '正常',
  productionAbnormalNote: '',
  sampleStatus: '正常',
  sampleAbnormalNote: '',
  shelfLifeDate: '',
  shelfLifePurpose: '',
  storageCondition: '常温库（25°C）',
  inspectionResult: '符合',
  dataAnalysis: '',
  trialConclusion: '',
  conclusionNote: '',
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
  if (form.experimentMaterials.length === 0 && rawMatsFromStep2.value.length > 0) {
    form.experimentMaterials = rawMatsFromStep2.value;
  }
});

const getFormData = () => ({ ...form, experimentMaterials: form.experimentMaterials.map(m => ({ ...m })) });

const handleSubmit = async () => {
  if (!form.trialConclusion) { ElMessage.warning('请选择试验结论'); return; }
  emit('submitted', getFormData());
};

defineExpose({ validate: () => formRef.value?.validate() });
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
