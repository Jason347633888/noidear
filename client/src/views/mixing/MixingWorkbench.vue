<template>
  <div class="mixing-workbench">
    <el-card>
      <template #header><span>配料执行</span></template>
      <el-form :model="form" label-width="100px" style="max-width: 700px">
        <el-form-item label="产品">
          <el-select v-model="form.productId" placeholder="选择产品" style="width: 100%" filterable @change="onProductChange">
            <el-option v-for="p in products" :key="p.id" :label="`${p.name} (${p.code})`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="配方">
          <el-select v-model="form.recipeId" placeholder="请先选择产品" style="width: 100%" :disabled="!form.productId" :loading="loadingRecipes" @change="onRecipeChange">
            <el-option
              v-for="r in activeRecipes"
              :key="r.id"
              :label="`v${r.version}${r.version_note ? ' — ' + r.version_note : ''}`"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="配料区">
          <el-select v-model="form.areaId" placeholder="选择配料区" style="width: 100%" filterable>
            <el-option v-for="area in areas" :key="area.id" :label="area.name" :value="area.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="工作日期">
          <el-date-picker v-model="form.workDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="实际配料重量">
          <el-input-number v-model="form.actualWeight" :min="0.001" />
        </el-form-item>

        <el-divider>原辅料明细</el-divider>
        <div v-for="(line, index) in form.lines" :key="index" style="margin-bottom: 16px; padding: 12px; border: 1px solid #eee; border-radius: 4px;">
          <div style="margin-bottom: 8px; font-size: 13px; color: #666;">
            <strong>明细 {{ index + 1 }}：</strong>{{ line.recipeLineLabel || '自定义明细' }}
          </div>
          <el-form-item label="原辅料批次">
            <div style="display: flex; gap: 8px; width: 100%">
              <el-select v-model="line.materialBatchId" filterable placeholder="选择原辅料批次" style="flex: 1">
                <el-option
                  v-for="stock in line.recommendedStocks || []"
                  :key="stock.materialBatchId"
                  :label="`${stock.batchNumber ?? stock.materialBatchId} / 剩余 ${stock.availableQuantity}`"
                  :value="stock.materialBatchId"
                />
              </el-select>
              <el-button size="small" @click="loadRecommendations(index)" :disabled="!form.areaId || !line.materialId">获取推荐</el-button>
            </div>
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

        <el-form-item v-if="!form.recipeId">
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
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { mixingApi } from '@/api/mixing';
import { productApi, type Product } from '@/api/product';
import { recipeApi, type Recipe } from '@/api/recipe';
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';

interface MixingLine {
  recipeLineId: string;
  recipeLineLabel: string;
  materialId: string;
  materialBatchId: string;
  actualQuantity: number;
  manualOverride: boolean;
  overrideReason?: string;
  recommendedStocks?: any[];
}

const submitting = ref(false);
const loadingRecipes = ref(false);
const products = ref<Product[]>([]);
const recipes = ref<Recipe[]>([]);
const areas = ref<WorkshopArea[]>([]);

const activeRecipes = computed(() => recipes.value.filter((r) => r.status === 'active'));

const form = ref({
  productId: '',
  recipeId: '',
  areaId: '',
  workDate: '',
  actualWeight: 0,
  lines: [] as MixingLine[],
});

const onProductChange = async (productId: string) => {
  form.value = { ...form.value, recipeId: '', lines: [] };
  if (!productId) { recipes.value = []; return; }
  loadingRecipes.value = true;
  try {
    const res: any = await recipeApi.getByProduct(productId);
    recipes.value = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
  } catch {
    ElMessage.error('加载配方失败');
  } finally {
    loadingRecipes.value = false;
  }
};

const onRecipeChange = (recipeId: string) => {
  const recipe = recipes.value.find((r) => r.id === recipeId);
  if (!recipe) { form.value = { ...form.value, lines: [] }; return; }
  form.value = {
    ...form.value,
    lines: recipe.lines.map((line) => ({
      recipeLineId: line.id,
      recipeLineLabel: `${line.area_name_snapshot ? '[' + line.area_name_snapshot + '] ' : ''}${line.material?.name ?? line.material_id} × ${line.qty_per_batch} ${line.unit}`,
      materialId: line.material_id,
      materialBatchId: '',
      actualQuantity: line.qty_per_batch,
      manualOverride: false,
      overrideReason: '',
      recommendedStocks: [],
    })),
  };
};

const addLine = () => {
  form.value = {
    ...form.value,
    lines: [
      ...form.value.lines,
      { recipeLineId: '', recipeLineLabel: '', materialId: '', materialBatchId: '', actualQuantity: 0, manualOverride: false, recommendedStocks: [] },
    ],
  };
};

const removeLine = (index: number) => {
  form.value = {
    ...form.value,
    lines: form.value.lines.filter((_, i) => i !== index),
  };
};

const loadRecommendations = async (index: number) => {
  const line = form.value.lines[index];
  if (!form.value.areaId || !line.materialId) return;
  try {
    const res: any = await mixingApi.recommendMaterialBatches({
      areaId: form.value.areaId,
      materialId: line.materialId,
      requiredQuantity: line.actualQuantity > 0 ? line.actualQuantity : 1,
    });
    const recommendations = res?.recommendations ?? res?.data?.recommendations ?? [];
    form.value = {
      ...form.value,
      lines: form.value.lines.map((l, i) =>
        i === index ? { ...l, recommendedStocks: recommendations } : l,
      ),
    };
  } catch {
    ElMessage.error('加载推荐批次失败');
  }
};

const submitExecution = async () => {
  if (!form.value.recipeId || !form.value.productId || !form.value.areaId) {
    ElMessage.error('请选择产品、配方和配料区');
    return;
  }
  if (!form.value.workDate) {
    ElMessage.error('请选择工作日期');
    return;
  }
  if (form.value.actualWeight <= 0) {
    ElMessage.error('请填写实际配料重量');
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
  submitting.value = true;
  try {
    await mixingApi.createExecution({
      recipeId: form.value.recipeId,
      productId: form.value.productId,
      areaId: form.value.areaId,
      workDate: form.value.workDate,
      actualWeight: form.value.actualWeight,
      lines: form.value.lines.map(({ recipeLineId, materialBatchId, actualQuantity, manualOverride, overrideReason }) => ({
        recipeLineId,
        materialBatchId,
        actualQuantity,
        manualOverride,
        overrideReason,
      })),
    });
    ElMessage.success('配料执行提交成功');
  } catch {
    ElMessage.error('配料执行提交失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  try {
    const [productsRes, areasRes]: [any, any] = await Promise.all([
      productApi.getList(),
      workshopAreaApi.getList(),
    ]);
    products.value = Array.isArray(productsRes.data) ? productsRes.data : (Array.isArray(productsRes) ? productsRes : []);
    areas.value = Array.isArray(areasRes.data) ? areasRes.data : (Array.isArray(areasRes) ? areasRes : []);
  } catch {
    ElMessage.error('加载基础数据失败');
  }
});
</script>
