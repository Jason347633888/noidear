<template>
  <div class="recipe-list-page">
    <div class="page-header">
      <h1 class="page-title">配方管理</h1>
      <p class="page-subtitle">管理产品配方版本及物料配比</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">配方列表</span>
            <span class="card-count">共 {{ filteredList.length }} 条记录</span>
          </div>
          <el-select
            v-model="filterProductId"
            placeholder="按产品筛选"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="p in productOptions"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </div>
      </template>

      <el-table :data="filteredList" v-loading="loading" stripe>
        <el-table-column label="产品名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ getProductName(row.product_id) }}</template>
        </el-table-column>
        <el-table-column label="版本号" width="90">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getRecipeStatusType(row.status)" effect="light" size="small">
              {{ getRecipeStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="配方行数" width="90">
          <template #default="{ row }">{{ row.lines?.length ?? 0 }} 行</template>
        </el-table-column>
        <el-table-column prop="version_note" label="版本说明" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.version_note || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/recipes/${row.id}/edit`)">修改配方</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { recipeApi, type Recipe, getRecipeStatusText, getRecipeStatusType } from '@/api/recipe';
import { productApi, type Product } from '@/api/product';

const router = useRouter();

const list = ref<Recipe[]>([]);
const loading = ref(false);
const productOptions = ref<Product[]>([]);
const filterProductId = ref<string>('');

const filteredList = computed(() => {
  if (!filterProductId.value) return list.value;
  return list.value.filter((r) => r.product_id === filterProductId.value);
});

function getProductName(productId: string): string {
  return productOptions.value.find((p) => p.id === productId)?.name ?? productId;
}

async function loadList() {
  loading.value = true;
  try {
    list.value = await recipeApi.getList() as unknown as Recipe[];
  } catch {
    ElMessage.error('加载配方列表失败');
  } finally {
    loading.value = false;
  }
}

async function loadProducts() {
  try {
    productOptions.value = await productApi.getList() as unknown as Product[];
  } catch { /* silent */ }
}

async function handleDelete(row: Recipe) {
  const productName = getProductName(row.product_id);
  await ElMessageBox.confirm(
    `确定要删除「${productName}」v${row.version} 的配方吗？此操作不可撤销。`,
    '删除确认',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
  );
  try {
    await recipeApi.remove(row.id);
    ElMessage.success('删除成功');
    await loadList();
  } catch {
    ElMessage.error('删除失败，请重试');
  }
}

onMounted(() => {
  loadList();
  loadProducts();
});
</script>

<style scoped>
.recipe-list-page { padding: 24px; }

.page-header { margin-bottom: 24px; }

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title { font-size: 16px; font-weight: 600; color: #303133; }
.card-count { font-size: 13px; color: #909399; }
</style>
