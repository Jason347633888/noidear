<template>
  <div class="mixing-workbench">
    <el-card>
      <template #header><span>配料执行</span></template>
      <el-form :model="form" label-width="100px" style="max-width: 700px">
        <el-form-item label="产品"><el-input v-model="form.productId" placeholder="产品ID" /></el-form-item>
        <el-form-item label="配方"><el-input v-model="form.recipeId" placeholder="配方ID" /></el-form-item>
        <el-form-item label="配料区"><el-input v-model="form.areaId" placeholder="配料区ID" /></el-form-item>
        <el-form-item label="工作日期"><el-date-picker v-model="form.workDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="实际配料重量"><el-input-number v-model="form.actualWeight" :min="0.001" /></el-form-item>

        <el-divider>原辅料明细</el-divider>
        <div v-for="(line, index) in form.lines" :key="index" style="margin-bottom: 16px; padding: 12px; border: 1px solid #eee; border-radius: 4px;">
          <el-form-item :label="`配方明细${index + 1}`">
            <el-input v-model="line.recipeLineId" placeholder="配方明细ID" />
          </el-form-item>
          <el-form-item label="原辅料批次">
            <el-select v-model="line.materialBatchId" filterable placeholder="选择原辅料批次">
              <el-option
                v-for="stock in line.recommendedStocks || []"
                :key="stock.materialBatchId"
                :label="`${stock.batchNumber ?? stock.materialBatchId} / 剩余 ${stock.availableQuantity}`"
                :value="stock.materialBatchId"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="实际用量">
            <el-input-number v-model="line.actualQuantity" :min="0.001" />
          </el-form-item>
          <el-form-item label="">
            <el-checkbox v-model="line.manualOverride">人工改选批次</el-checkbox>
          </el-form-item>
          <el-form-item v-if="line.manualOverride" label="改选原因">
            <el-input v-model="line.overrideReason" placeholder="填写人工改选原因" />
          </el-form-item>
          <el-button size="small" type="danger" @click="removeLine(index)">删除明细</el-button>
        </div>

        <el-form-item>
          <el-button @click="addLine">+ 添加明细</el-button>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submitExecution">提交配料执行</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { mixingApi } from '@/api/mixing';

const submitting = ref(false);

const form = ref({
  productId: '',
  recipeId: '',
  areaId: '',
  workDate: '',
  actualWeight: 0,
  lines: [] as Array<{
    recipeLineId: string;
    materialBatchId: string;
    actualQuantity: number;
    manualOverride: boolean;
    overrideReason?: string;
    recommendedStocks?: any[];
  }>,
});

const addLine = () => {
  form.value = {
    ...form.value,
    lines: [
      ...form.value.lines,
      { recipeLineId: '', materialBatchId: '', actualQuantity: 0, manualOverride: false, recommendedStocks: [] },
    ],
  };
};

const removeLine = (index: number) => {
  form.value = {
    ...form.value,
    lines: form.value.lines.filter((_, i) => i !== index),
  };
};

const submitExecution = async () => {
  if (!form.value.recipeId || !form.value.productId || !form.value.areaId) {
    ElMessage.error('请选择产品、配方和配料区');
    return;
  }
  if (form.value.lines.length === 0) {
    ElMessage.error('请至少添加一项原辅料明细');
    return;
  }
  if (form.value.lines.some((line) => !line.materialBatchId || line.actualQuantity <= 0)) {
    ElMessage.error('请完成每一项原辅料批次和实际用量');
    return;
  }
  if (form.value.lines.some((line) => line.manualOverride && !line.overrideReason)) {
    ElMessage.error('人工改选批次必须填写原因');
    return;
  }
  try {
    submitting.value = true;
    await mixingApi.createExecution({
      recipeId: form.value.recipeId,
      productId: form.value.productId,
      areaId: form.value.areaId,
      workDate: form.value.workDate,
      actualWeight: form.value.actualWeight,
      lines: form.value.lines,
    });
    ElMessage.success('配料执行提交成功');
  } catch {
    ElMessage.error('配料执行提交失败');
  } finally {
    submitting.value = false;
  }
};
</script>
