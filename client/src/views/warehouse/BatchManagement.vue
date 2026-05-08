<template>
  <div class="batch-management">
    <PageHeaderBlock eyebrow="追溯与批次" title="批次仓储管理" />

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel--padded">
        <el-form :model="filterForm" inline>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" clearable placeholder="全部">
              <el-option value="normal" label="正常" />
              <el-option value="expired" label="已过期" />
              <el-option value="locked" label="已锁定" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">批次管理</h3>
      </div>
      <div class="app-panel--padded">
        <el-table :data="tableData" v-loading="loading" stripe>
          <el-table-column prop="batchNumber" label="批次号" width="160" />
          <el-table-column label="物料" min-width="180">
            <template #default="{ row }">{{ row.material?.name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="expiryDate" label="有效期至" width="120">
            <template #default="{ row }">
              {{ row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('zh-CN') : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="供应商" width="150">
            <template #default="{ row }">{{ row.supplier?.name || '-' }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="batchStatusType(row.status)" size="small">
                {{ batchStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="receivedAt" label="入库时间" width="180">
            <template #default="{ row }">{{ new Date(row.receivedAt).toLocaleString('zh-CN') }}</template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSearch"
            @current-change="handleSearch"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { batchApi } from '@/api/warehouse';

const loading = ref(false);
const tableData = ref<any[]>([]);
const filterForm = reactive({ status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const batchStatusText = (s: string) => ({ normal: '正常', expired: '已过期', locked: '已锁定' }[s] || s);
const batchStatusType = (s: string) => ({ normal: 'success', expired: 'danger', locked: 'warning' }[s] || 'info');

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await batchApi.getList({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取批次列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.status = ''; handleSearch(); };

onMounted(() => { fetchData(); });
</script>

<style scoped>
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
