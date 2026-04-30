<template>
  <div class="product-list-page">
    <div class="page-header">
      <h1 class="page-title">产品目录</h1>
      <p class="page-subtitle">管理企业产品信息及状态</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">产品列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button @click="legacyDrawerVisible = true">历史产品建档</el-button>
            <el-button type="primary" @click="router.push('/process')">
              <el-icon><Plus /></el-icon>发起新产品研发
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="code" label="产品编号" min-width="140" show-overflow-tooltip />
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getProductStatusType(row.status)"
              effect="light"
              size="small"
            >
              {{ getProductStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              data-test="product-detail"
              @click="openDetail(row)"
            >
              查看/详情
            </el-button>
            <el-button link type="warning" @click="handleArchive(row)">归档</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <LegacyProductDrawer v-model="legacyDrawerVisible" @created="loadList" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import {
  productApi,
  type Product,
  getProductStatusText,
  getProductStatusType,
} from '@/api/product';
import LegacyProductDrawer from './LegacyProductDrawer.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const router = useRouter();
const list = ref<Product[]>([]);
const loading = ref(false);
const legacyDrawerVisible = ref(false);

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await productApi.getList();
    list.value = res as unknown as Product[];
  } catch {
    ElMessage.error('加载产品列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Detail navigation ────────────────────────────────────────────────────────

function openDetail(row: Product) {
  router.push(`/products/${row.id}`);
}

// ── Archive ───────────────────────────────────────────────────────────────────

async function handleArchive(row: Product) {
  try {
    await ElMessageBox.confirm(
      `确定要归档产品「${row.name}」吗？归档后产品、配方和工序将退出正常业务，历史追溯记录会保留。`,
      '归档确认',
      {
        confirmButtonText: '确定归档',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  try {
    await productApi.archive(row.id);
    ElMessage.success('归档成功');
    await loadList();
  } catch {
    ElMessage.error('归档失败，请重试');
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.product-list-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

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

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-count {
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}
</style>
