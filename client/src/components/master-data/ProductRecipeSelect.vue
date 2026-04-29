<template>
  <div class="product-recipe-select">
    <el-select
      v-model="localProductId"
      filterable
      clearable
      placeholder="选择产品"
      style="width: 100%"
      @change="handleProductChange"
    >
      <el-option v-for="p in products" :key="p.id" :label="`${p.code} ${p.name}`" :value="p.id" />
    </el-select>
    <el-select
      v-model="localRecipeId"
      filterable
      clearable
      placeholder="选择配方版本"
      style="width: 100%"
      @change="emitChange"
    >
      <el-option
        v-for="r in activeRecipes"
        :key="r.id"
        :label="`v${r.version}${r.status === 'active' ? ' (激活)' : ''}`"
        :value="r.id"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { productApi, type Product } from '@/api/product';
import { recipeApi, type Recipe } from '@/api/recipe';

const props = defineProps<{ productId?: string; recipeId?: string }>();
const emit = defineEmits<{ (e: 'change', value: { productId: string; recipeId: string }): void }>();

const products = ref<Product[]>([]);
const recipes = ref<Recipe[]>([]);
const localProductId = ref(props.productId ?? '');
const localRecipeId = ref(props.recipeId ?? '');

const activeRecipes = computed(() => recipes.value);

watch(() => props.productId, (v) => { localProductId.value = v ?? ''; });
watch(() => props.recipeId, (v) => { localRecipeId.value = v ?? ''; });

onMounted(async () => {
  try {
    const res = await productApi.getList();
    products.value = (res as any)?.data ?? (res as any)?.list ?? (Array.isArray(res) ? res : []);
  } catch {
    products.value = [];
  }
  if (localProductId.value) {
    await loadRecipes(localProductId.value);
  }
});

async function loadRecipes(productId: string) {
  try {
    const res = await recipeApi.getByProduct(productId);
    recipes.value = (res as any)?.data ?? (Array.isArray(res) ? res : []);
  } catch {
    recipes.value = [];
  }
}

async function handleProductChange(productId: string) {
  localRecipeId.value = '';
  recipes.value = [];
  if (productId) {
    await loadRecipes(productId);
  }
  emitChange();
}

function emitChange() {
  emit('change', { productId: localProductId.value, recipeId: localRecipeId.value });
}
</script>

<style scoped>
.product-recipe-select {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 8px;
}
</style>
