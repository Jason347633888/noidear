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
      <el-form-item label="产品" prop="product_id">
        <el-select
          v-model="form.product_id"
          filterable
          placeholder="搜索产品"
          style="width: 100%"
          @change="onProductChange"
        >
          <el-option
            v-for="p in products"
            :key="p.id"
            :label="p.name"
            :value="p.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="配方">
        <el-select
          v-model="form.recipe_id"
          clearable
          placeholder="使用激活配方"
          style="width: 100%"
        >
          <el-option
            v-for="r in recipes"
            :key="r.id"
            :label="`v${r.version}${r.status === 'active' ? ' (激活)' : ''}`"
            :value="r.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">开产</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { productApi, type Product } from '@/api/product';
import { recipeApi, type Recipe } from '@/api/recipe';
import { ProductionRunApi } from '@/api/production-run';

const props = defineProps<{ modelValue: boolean; shiftInstanceId: string }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created'): void;
}>();

const formRef = ref<FormInstance>();
const loading = ref(false);
const products = ref<Product[]>([]);
const recipes = ref<Recipe[]>([]);

const form = reactive({
  production_line: '',
  product_id: '',
  recipe_id: '',
});

const rules: FormRules = {
  production_line: [{ required: true, message: '请填写产线', trigger: 'blur' }],
  product_id: [{ required: true, message: '请选择产品', trigger: 'change' }],
};

onMounted(async () => {
  products.value = (await productApi.getList()) as unknown as Product[];
});

async function onProductChange(productId: string) {
  form.recipe_id = '';
  recipes.value = (await recipeApi.getByProduct(productId)) as unknown as Recipe[];
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    await ProductionRunApi.create({
      shift_instance_id: props.shiftInstanceId,
      production_line: form.production_line,
      product_id: form.product_id,
      recipe_id: form.recipe_id || undefined,
    });
    emit('update:modelValue', false);
    emit('created');
  } finally {
    loading.value = false;
  }
}
</script>
