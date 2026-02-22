<template>
  <div class="material-balance">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <span>物料平衡报表</span>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe show-summary>
        <el-table-column prop="materialCode" label="物料编码" width="120" />
        <el-table-column prop="materialName" label="物料名称" min-width="180" />
        <el-table-column prop="inputQuantity" label="投入量" width="100" />
        <el-table-column prop="outputQuantity" label="产出量" width="100" />
        <el-table-column prop="wasteQuantity" label="损耗量" width="100" />
        <el-table-column prop="balance" label="平衡差" width="100">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.balance < 0, 'text-success': row.balance >= 0 }">
              {{ row.balance }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="yieldRate" label="收率(%)" width="100">
          <template #default="{ row }">
            <el-progress
              :percentage="row.yieldRate"
              :color="row.yieldRate >= 95 ? '#67c23a' : row.yieldRate >= 90 ? '#e6a23c' : '#f56c6c'"
              :stroke-width="6"
              :show-text="false"
            />
            <span class="yield-text">{{ row.yieldRate }}%</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { materialBalanceApi } from '@/api/warehouse';

const loading = ref(false);
const tableData = ref<any[]>([]);
const filterForm = reactive({ dateRange: null as [string, string] | null });

const fetchData = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterForm.dateRange) {
      params.dateFrom = filterForm.dateRange[0];
      params.dateTo = filterForm.dateRange[1];
    }
    const res: any = await materialBalanceApi.getBalance(params);
    tableData.value = res;
  } catch (error) {
    ElMessage.error('获取物料平衡数据失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.text-danger { color: #f56c6c; font-weight: 600; }
.text-success { color: #67c23a; font-weight: 600; }
.yield-text { font-size: 12px; margin-left: 4px; }
</style>
