<template>
  <div class="recipe-list-page">
    <PageHeaderBlock eyebrow="生产执行" title="配方管理" description="管理产品配方版本及物料配比" />

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">{{ isArchiveView ? '归档配方' : '可用配方' }}</span>
            <span class="card-count">共 {{ filteredList.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-radio-group v-model="viewMode" @change="loadList">
              <el-radio-button label="active">可用配方</el-radio-button>
              <el-radio-button label="archive">归档配方</el-radio-button>
            </el-radio-group>
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
        <el-table-column v-if="isArchiveView" label="归档原因" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ getArchiveReason(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <template v-if="!isArchiveView">
              <el-button link type="primary" @click="$router.push(`/recipes/${row.id}/edit`)">修改配方</el-button>
              <el-button link type="warning" @click="handleArchive(row)">归档</el-button>
            </template>
            <span v-else class="readonly-text">仅查看</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { recipeApi, type Recipe, getRecipeStatusText, getRecipeStatusType } from '@/api/recipe';
import { productApi, type Product } from '@/api/product';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const list = ref<Recipe[]>([]);
const loading = ref(false);
const productOptions = ref<Product[]>([]);
const filterProductId = ref<string>('');
const viewMode = ref<'active' | 'archive'>('active');

const isArchiveView = computed(() => viewMode.value === 'archive');

const filteredList = computed(() => {
  if (!filterProductId.value) return list.value;
  return list.value.filter((r) => r.product_id === filterProductId.value);
});

function getProductName(productId: string): string {
  return productOptions.value.find((p) => p.id === productId)?.name
    ?? list.value.find((r) => r.product_id === productId)?.product?.name
    ?? productId;
}

function getArchiveReason(row: Recipe): string {
  if (row.product?.deleted_at) return '产品已归档';
  if (row.product?.status && row.product.status !== 'active') return '产品已退出正常业务';
  if (row.status === 'archived') return '配方版本已归档';
  return '-';
}

async function loadList() {
  loading.value = true;
  try {
    list.value = await recipeApi.getList(isArchiveView.value) as unknown as Recipe[];
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

async function handleArchive(row: Recipe) {
  const productName = getProductName(row.product_id);
  try {
    await ElMessageBox.confirm(
      `确定要归档「${productName}」v${row.version} 的配方吗？归档后不会出现在可用配方列表中。`,
      '归档确认',
      { confirmButtonText: '确定归档', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await recipeApi.archive(row.id);
    ElMessage.success('归档成功');
    await loadList();
  } catch {
    ElMessage.error('归档失败，请重试');
  }
}

onMounted(() => {
  loadList();
  loadProducts();
});
</script>

<style scoped>
.recipe-list-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.readonly-text {
  color: #909399;
  font-size: 13px;
}
</style>
