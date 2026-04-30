<template>
  <div class="staging-area">
    <el-card>
      <template #header><span>配料区库存与盘点</span></template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="库存" name="stock">
          <el-table :data="stocks" v-loading="loading" stripe>
            <el-table-column prop="area.name" label="配料区" width="120" />
            <el-table-column label="物料" min-width="160">
              <template #default="{ row }">{{ row.batch?.material?.name || '-' }}</template>
            </el-table-column>
            <el-table-column label="批次号" width="150">
              <template #default="{ row }">{{ row.batch?.batchNumber || '-' }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="100" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="班前盘点" name="start">
          <el-form :model="startForm" label-width="100px" style="max-width: 600px">
            <el-form-item label="配料区"><el-input v-model="startForm.areaId" placeholder="配料区ID" /></el-form-item>
            <el-form-item label="原辅料批次"><el-input v-model="startForm.batchId" placeholder="批次ID" /></el-form-item>
            <el-form-item label="班次"><el-input v-model="startForm.shiftTypeId" placeholder="班次ID" /></el-form-item>
            <el-form-item label="工作日期"><el-date-picker v-model="startForm.workDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
            <el-form-item label="实际数量"><el-input-number v-model="startForm.actualQuantity" :min="0" /></el-form-item>
            <el-form-item><el-button type="primary" @click="submitStocktake('shift_start', startForm)">提交班前盘点</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="班后/交班盘点" name="handover">
          <el-form :model="handoverForm" label-width="100px" style="max-width: 600px">
            <el-form-item label="配料区"><el-input v-model="handoverForm.areaId" placeholder="配料区ID" /></el-form-item>
            <el-form-item label="原辅料批次"><el-input v-model="handoverForm.batchId" placeholder="批次ID" /></el-form-item>
            <el-form-item label="班次"><el-input v-model="handoverForm.shiftTypeId" placeholder="班次ID" /></el-form-item>
            <el-form-item label="工作日期"><el-date-picker v-model="handoverForm.workDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
            <el-form-item label="实际数量"><el-input-number v-model="handoverForm.actualQuantity" :min="0" /></el-form-item>
            <el-form-item label="类型">
              <el-radio-group v-model="handoverKind">
                <el-radio value="shift_end">班后</el-radio>
                <el-radio value="handover">交班</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item><el-button type="primary" @click="submitStocktake(handoverKind, handoverForm)">提交盘点</el-button></el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { stagingAreaApi } from '@/api/warehouse';

type StocktakeKind = 'shift_start' | 'shift_end' | 'handover';

interface StocktakeFormState {
  areaId: string;
  batchId: string;
  shiftTypeId: string;
  workDate: string;
  actualQuantity: number;
}

const activeTab = ref('stock');
const loading = ref(false);
const stocks = ref<any[]>([]);
const handoverKind = ref<'shift_end' | 'handover'>('shift_end');

const startForm = ref<StocktakeFormState>({
  areaId: '',
  batchId: '',
  shiftTypeId: '',
  workDate: '',
  actualQuantity: 0,
});

const handoverForm = ref<StocktakeFormState>({
  areaId: '',
  batchId: '',
  shiftTypeId: '',
  workDate: '',
  actualQuantity: 0,
});

const fetchStocks = async () => {
  try {
    loading.value = true;
    const res: any = await stagingAreaApi.getStock();
    stocks.value = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  } catch {
    ElMessage.error('加载库存失败');
  } finally {
    loading.value = false;
  }
};

const submitStocktake = async (kind: StocktakeKind, form: StocktakeFormState) => {
  if (!form.areaId || !form.batchId || !form.shiftTypeId || !form.workDate) {
    ElMessage.error('请填写所有必填项');
    return;
  }
  try {
    await stagingAreaApi.confirmStocktake({ ...form, kind });
    ElMessage.success('盘点提交成功');
  } catch {
    ElMessage.error('盘点提交失败');
  }
};

onMounted(fetchStocks);
</script>
