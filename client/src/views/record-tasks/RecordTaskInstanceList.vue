<template>
  <div class="instance-list">
    <PageHeaderBlock
      eyebrow="工作执行"
      title="待填任务"
      description="截止时间优先，先处理到期和逾期的记录任务。"
    />

    <div class="app-panel table-card">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">任务列表</h3>
      </div>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="任务标题" min-width="180">
          <template #default="{ row }">
            <span :class="{ 'overdue-text': row.status === 'overdue' }">
              {{ row.assignment?.title || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="模板名称" width="160">
          <template #default="{ row }">
            {{ row.assignment?.template?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="130">
          <template #default="{ row }">
            <span :class="{ 'overdue-text': row.status === 'overdue' }">
              {{ formatDate(row.deadline) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTypeMap[row.status]" size="small">
              {{ statusTextMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="row.status !== 'pending'"
              @click="router.push(`/records/task/${row.id}`)"
            >
              去处理
            </el-button>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { instanceApi } from '@/api/record-task';
import dayjs from 'dayjs';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const router = useRouter();
const loading = ref(false);
const tableData = ref<any[]>([]);

const statusTextMap: Record<string, string> = {
  pending: '待填写',
  submitted: '已提交',
  overdue: '已逾期',
};

const statusTypeMap: Record<string, string> = {
  pending: 'warning',
  submitted: 'success',
  overdue: 'danger',
};

const pagination = reactive({ page: 1, limit: 20, total: 0 });

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD');
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await instanceApi.getPending({
      page: pagination.page,
      limit: pagination.limit,
    });
    tableData.value = res.list || [];
    pagination.total = res.total || 0;
  } catch {
    ElMessage.error('获取待填任务失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.instance-list {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card { overflow: hidden; }
.pagination-wrap { display: flex; justify-content: flex-end; padding: 16px 20px; }
.overdue-text { color: var(--shell-danger); font-weight: 500; }
</style>
