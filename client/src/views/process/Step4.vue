<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="160px" :disabled="disabled">
      <el-divider>四. 研发试验原始记录（小试）</el-divider>

      <el-form-item label="试验日期">
        <el-input :model-value="form.trialDate" disabled />
      </el-form-item>

      <el-form-item label="生产批次" prop="batchNumber"
        :rules="[{ required: true, message: '请填写生产批次' }]">
        <el-input v-model="form.batchNumber" />
      </el-form-item>

      <!-- 配料表 -->
      <el-form-item label="配料表">
        <div class="table-wrap">
          <el-table :data="form.ingredients" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="配料名称" prop="name" min-width="200">
              <template #default="{ row }">
                <el-input v-if="!disabled" v-model="row.name" size="small" />
                <span v-else>{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="重量" prop="weight" width="120">
              <template #default="{ row }">
                <el-input v-if="!disabled" v-model="row.weight" size="small" />
                <span v-else>{{ row.weight }}</span>
              </template>
            </el-table-column>
            <el-table-column v-if="!disabled" label="操作" width="80">
              <template #default="{ $index }">
                <el-button link type="danger" @click="form.ingredients = form.ingredients.filter((_, i) => i !== $index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button v-if="!disabled" size="small" @click="addIngredient" style="margin-top:8px">
            + 添加配料
          </el-button>
        </div>
      </el-form-item>

      <!-- 工艺参数 -->
      <el-form-item label="工艺参数" class="full-width">
        <ProcessParams
          v-model="form.processParams"
          :process-type="processType"
          :disabled="disabled"
        />
      </el-form-item>

      <el-form-item label="实验记录/结论">
        <el-input v-model="form.trialConclusion" type="textarea" :rows="4" />
      </el-form-item>
    </el-form>

    <div v-if="!disabled" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import ProcessParams from '@/components/process/ProcessParams.vue';
import { firstValidationMessage, validateStep4 } from '@/utils/processValidation';

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
  trialDate: dayjs().format('YYYY-MM-DD'),
  batchNumber: '',
  ingredients: [] as { name: string; weight: string }[],
  processParams: {} as Record<string, unknown>,
  trialConclusion: '',
});

const processType = computed(() => {
  const step1 = props.allStepsData?.[1] as Record<string, unknown> | undefined;
  return (step1?.processType as string[]) ?? [];
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as typeof form;
    if (mv.trialDate !== undefined) form.trialDate = mv.trialDate;
    if (mv.batchNumber !== undefined) form.batchNumber = mv.batchNumber;
    if (mv.ingredients !== undefined) form.ingredients = mv.ingredients;
    if (mv.processParams !== undefined) form.processParams = mv.processParams;
    if (mv.trialConclusion !== undefined) form.trialConclusion = mv.trialConclusion;
  }
});

const addIngredient = () => form.ingredients.push({ name: '', weight: '' });

const getFormData = () => ({
  ...form,
  ingredients: form.ingredients.map(i => ({ ...i })),
});

const handleSubmit = () => {
  const result = validateStep4(getFormData());
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
    return;
  }
  emit('submitted', getFormData());
};
</script>

<style scoped>
.step-view { padding: 16px; }
.table-wrap { width: 100%; }
.full-width :deep(.el-form-item__content) { display: block; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
