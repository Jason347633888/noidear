<template>
  <el-dialog
    :model-value="modelValue"
    title="开产"
    width="480px"
    @close="$emit('update:modelValue', false)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="产线" prop="production_line">
        <el-input v-model="form.production_line" placeholder="如：1号线" />
      </el-form-item>
      <el-form-item label="产品配方" prop="product_id">
        <ProductRecipeSelect
          :product-id="form.product_id"
          :recipe-id="form.recipe_id"
          @change="onProductRecipeChange"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">开产</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { ProductionRunApi } from '@/api/production-run';
import ProductRecipeSelect from '@/components/master-data/ProductRecipeSelect.vue';

const props = defineProps<{ modelValue: boolean; shiftInstanceId: string }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created'): void;
}>();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  production_line: '',
  product_id: '',
  recipe_id: '',
});

const rules: FormRules = {
  production_line: [{ required: true, message: '请填写产线', trigger: 'blur' }],
  product_id: [{ required: true, message: '请选择产品', trigger: 'change' }],
};

function onProductRecipeChange(value: { productId: string; recipeId: string }) {
  form.product_id = value.productId;
  form.recipe_id = value.recipeId;
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (!form.recipe_id) {
    ElMessage.warning('请选择配方版本');
    return;
  }
  loading.value = true;
  try {
    await ProductionRunApi.create({
      shift_instance_id: props.shiftInstanceId,
      production_line: form.production_line,
      product_id: form.product_id,
      recipe_id: form.recipe_id,
    });
    emit('update:modelValue', false);
    emit('created');
  } finally {
    loading.value = false;
  }
}
</script>
