<template>
  <div class="staging-area">
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>暂存间管理</span>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="物料" min-width="180">
          <template #default="{ row }">{{ row.material?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="批次号" width="160">
          <template #default="{ row }">{{ row.batch?.batchNumber || '-' }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="stagingStatusType(row.status)" size="small">
              {{ stagingStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stagedAt" label="暂存时间" width="180">
          <template #default="{ row }">{{ new Date(row.stagedAt).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'staged'"
              link type="success" @click="handleDispense(row)"
            >发放</el-button>
            <el-button
              v-if="row.status === 'staged'"
              link type="warning" @click="handleReturn(row)"
            >退回</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { stagingAreaApi } from '@/api/warehouse';

const loading = ref(false);
const tableData = ref<any[]>([]);
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const stagingStatusText = (s: string) => ({ staged: '暂存中', dispensed: '已发放', returned: '已退回' }[s] || s);
const stagingStatusType = (s: string) => ({ staged: 'warning', dispensed: 'success', returned: 'info' }[s] || 'info');

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await stagingAreaApi.getList({ page: pagination.page, limit: pagination.limit });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) { ElMessage.error('获取暂存间数据失败'); } finally { loading.value = false; }
};

const handleDispense = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要发放该物料吗？', '确认');
    await stagingAreaApi.dispense(row.id);
    ElMessage.success('发放成功');
    fetchData();
  } catch (error) { /* 取消 */ }
};

const handleReturn = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要退回该物料吗？', '确认');
    await stagingAreaApi.returnItem(row.id);
    ElMessage.success('退回成功');
    fetchData();
  } catch (error) { /* 取消 */ }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
