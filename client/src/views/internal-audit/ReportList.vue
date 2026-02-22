<template>
  <div class="report-list">
    <el-card>
      <template #header>
        <div class="header">
          <h2>内审报告</h2>
        </div>
      </template>

      <!-- 筛选 -->
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="queryForm.keyword"
            placeholder="搜索内审标题"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" v-loading="loading" border>
        <el-table-column label="内审标题" min-width="200">
          <template #default="{ row }">
            {{ row.plan?.title || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.plan?.type === 'quarterly'" type="success">季度内审</el-tag>
            <el-tag v-else-if="row.plan?.type === 'semiannual'" type="warning">半年内审</el-tag>
            <el-tag v-else-if="row.plan?.type === 'annual'" type="danger">年度内审</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="审核时间" width="200">
          <template #default="{ row }">
            <span v-if="row.plan?.startDate">
              {{ formatDate(row.plan.startDate) }} ~ {{ formatDate(row.plan.endDate) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="审核情况" width="180">
          <template #default="{ row }">
            <span>共 {{ row.totalDocuments }} 份，符合 {{ row.compliantCount }}，不符合 {{ row.nonCompliantCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="生成时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.generatedAt || row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleQuery"
        @current-change="handleQuery"
        class="pagination"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getReports, type AuditReport } from '@/api/internal-audit/report';

const router = useRouter();
const loading = ref(false);
const tableData = ref<AuditReport[]>([]);

const queryForm = reactive({
  keyword: '',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getReports({
      page: pagination.page,
      limit: pagination.limit,
      keyword: queryForm.keyword || undefined,
    });
    tableData.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    ElMessage.error(error.message || '获取报告列表失败');
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  queryForm.keyword = '';
  handleQuery();
};

const handleView = (row: AuditReport) => {
  router.push(`/internal-audit/reports/${row.id}`);
};

const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.report-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
}

.filter-form {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
