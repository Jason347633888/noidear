<template>
  <div class="batch-management">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="available" label="可用" />
            <el-option value="reserved" label="已预留" />
            <el-option value="consumed" label="已消耗" />
            <el-option value="expired" label="已过期" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>批次管理</span>
        </div>
      </template>
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
    </el-card>
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

const batchStatusText = (s: string) => ({ available: '可用', reserved: '已预留', consumed: '已消耗', expired: '已过期' }[s] || s);
const batchStatusType = (s: string) => ({ available: 'success', reserved: 'warning', consumed: 'info', expired: 'danger' }[s] || 'info');

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
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
