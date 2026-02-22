<template>
  <div class="alert-history-list">
    <el-card class="page-header">
      <h2>告警历史</h2>
      <p class="subtitle">查看系统告警触发历史</p>
    </el-card>

    <el-card class="filter-card">
      <el-form :model="filterForm" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="状态">
              <el-select v-model="filterForm.status" placeholder="请选择状态" clearable>
                <el-option label="已触发" value="triggered" />
                <el-option label="已恢复" value="resolved" />
                <el-option label="已确认" value="acknowledged" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="timeRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item>
              <el-button type="primary" @click="handleSearch">查询</el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="ruleName" label="规则名称" min-width="150" />
        <el-table-column prop="metricValue" label="触发值" width="100" />
        <el-table-column prop="message" label="告警消息" min-width="200" />
        <el-table-column prop="triggeredAt" label="触发时间" width="160" :formatter="formatTimeColumn" />
        <el-table-column prop="resolvedAt" label="恢复时间" width="160" :formatter="formatResolvedColumn" />
        <el-table-column prop="status" label="状态" width="100" :formatter="formatStatusColumn" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'triggered'"
              type="primary"
              link
              @click="handleAcknowledge(row.id)"
            >
              确认
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
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
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import { queryAlertHistory, acknowledgeAlert, type AlertHistory } from '@/api/monitoring';

const loading = ref(false);
const timeRange = ref<[string, string]>();

const filterForm = reactive({ status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const tableData = ref<AlertHistory[]>([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const { items, total } = await queryAlertHistory({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
      startTime: timeRange.value?.[0],
      endTime: timeRange.value?.[1],
    });
    tableData.value = items;
    pagination.total = total;
  } catch (error) {
    ElMessage.error('查询告警历史失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.status = '';
  timeRange.value = undefined;
  pagination.page = 1;
  fetchData();
};

const handleAcknowledge = async (id: string) => {
  try {
    await acknowledgeAlert(id);
    ElMessage.success('确认成功');
    fetchData();
  } catch (error) {
    ElMessage.error('确认失败');
  }
};

const formatTimeColumn = (row: AlertHistory) => dayjs(row.triggeredAt).format('YYYY-MM-DD HH:mm:ss');
const formatResolvedColumn = (row: AlertHistory) =>
  row.resolvedAt ? dayjs(row.resolvedAt).format('YYYY-MM-DD HH:mm:ss') : '-';

const formatStatusColumn = (row: AlertHistory) => {
  const map = { triggered: '已触发', resolved: '已恢复', acknowledged: '已确认' };
  return map[row.status] || row.status;
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.alert-history-list {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.filter-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
