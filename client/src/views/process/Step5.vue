<template>
  <div class="step-view">
    <el-form :model="form" label-width="200px" :disabled="disabled">
      <el-divider>产品标签信息记录（JL-04）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品基本信息</span></template>
        <el-form-item label="品名"><el-input :model-value="productName" disabled /></el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="form.recordDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="保质期（天）">
          <el-input-number v-model="form.shelfLifeDays" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="产品类型"><el-input v-model="form.productType" placeholder="烘烤类糕点" /></el-form-item>
        <el-form-item label="加工方式"><el-input v-model="form.processingMethod" placeholder="热加工" /></el-form-item>
        <el-form-item label="产品标准代号"><el-input v-model="form.productStandard" placeholder="GB 7099" /></el-form-item>
        <el-form-item label="储藏方法"><el-input v-model="form.storageConditions" placeholder="阴凉干燥处" /></el-form-item>
        <el-form-item label="食用方法"><el-input v-model="form.consumptionMethod" placeholder="开袋即食" /></el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">营养成分表（/100g）</span></template>
        <el-form-item label="能量（kJ/100g）">
          <el-input-number v-model="form.nutritionEnergy" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="蛋白质（g/100g）">
          <el-input-number v-model="form.nutritionProtein" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="脂肪（g/100g）">
          <el-input-number v-model="form.nutritionFat" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="反式脂肪酸（g/100g）">
          <el-input-number v-model="form.nutritionTransFat" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="碳水化合物（g/100g）">
          <el-input-number v-model="form.nutritionCarb" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="钠（mg/100g）">
          <el-input-number v-model="form.nutritionSodium" :min="0" :precision="0" controls-position="right" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">配料与过敏原</span></template>
        <el-form-item label="配料表">
          <el-input v-model="form.ingredientList" type="textarea" :rows="3" placeholder="按配料量降序排列" />
        </el-form-item>
        <el-form-item label="致敏物质提示">
          <el-input v-model="form.allergens" placeholder="含麸质谷物(小麦)、蛋及蛋制品、乳及乳制品" />
        </el-form-item>
        <el-form-item label="产品标签声称合法性声明">
          <el-input v-model="form.labelClaimStatement" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">审批 — 总经理确认</span></template>
        <DeptSignoffPanel
          v-if="stepStatus === 'SUBMITTED'"
          :instance-id="instanceId"
          :step-number="5"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">已获总经理确认</el-text>
        <el-text v-else type="info" size="small">提交后等待总经理确认</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', { ...form })">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import DeptSignoffPanel from '@/components/process/DeptSignoffPanel.vue';

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

const form = reactive({
  recordDate: dayjs().format('YYYY-MM-DD'),
  shelfLifeDays: 30,
  productType: '烘烤类糕点',
  processingMethod: '热加工',
  productStandard: 'GB 7099',
  storageConditions: '阴凉干燥处',
  consumptionMethod: '开袋即食',
  nutritionEnergy: 0,
  nutritionProtein: 0,
  nutritionFat: 0,
  nutritionTransFat: 0,
  nutritionCarb: 0,
  nutritionSodium: 0,
  ingredientList: '',
  allergens: '含麸质谷物(小麦)、蛋及蛋制品、乳及乳制品',
  labelClaimStatement: '',
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
});

const handleSubmit = () => {
  if (!form.ingredientList.trim()) { ElMessage.warning('请填写配料表'); return; }
  emit('submitted', { ...form });
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
