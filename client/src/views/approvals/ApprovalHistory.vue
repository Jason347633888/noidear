<template>
  <div class="approval-history-page">
    <div class="page-header">
      <h1 class="page-title">审批历史</h1>
      <p class="page-subtitle">查看已处理的审批记录</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="title-wrap">
            <span class="card-title">已处理审批</span>
            <span class="total-text">共 {{ filteredTotal }} 条</span>
          </div>
          <div class="filter-wrap">
            <el-select v-model="filterStatus" placeholder="全部结果" clearable style="width: 140px" size="default" @change="handleFilterChange">
              <el-option label="全部结果" value="" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe class="history-table">
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.documentId ? 'warning' : 'primary'">
              {{ row.documentId ? '文档' : '任务记录' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" min-width="200">
          <template #default="{ row }">
            <span class="source-text">{{ getSourceTitle(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="审批结果" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'approved' ? 'success' : 'danger'">
              {{ row.status === 'approved' ? '已通过' : '已驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">
              {{ getApprovalTypeLabel(row.approvalType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">
            <div class="creator-info">
              <div class="creator-avatar">{{ getSubmitterInitial(row) }}</div>
              <span>{{ getSubmitterName(row) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="审批意见" min-width="150">
          <template #default="{ row }">
            <span v-if="row.comment" class="comment-text">{{ row.comment }}</span>
            <span v-else-if="row.rejectionReason" class="rejection-text">{{ row.rejectionReason }}</span>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column label="处理时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.approvedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">
              <el-icon><View /></el-icon>详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !tableData.length" description="暂无已处理的审批记录" :image-size="120" />

      <div v-if="filteredTotal > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import approvalApi from '@/api/approval';
import type { Approval } from '@/api/approval';
import { View } from '@element-plus/icons-vue';

const router = useRouter();
const loading = ref(false);
const tableData = ref<Approval[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterStatus = ref<string>('');

const filteredTotal = computed(() => {
  if (!filterStatus.value) return total.value;
  return tableData.value.filter((row) => row.status === filterStatus.value).length;
});

const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const getSourceTitle = (row: Approval): string => {
  if (row.document) {
    return `${row.document.number || ''} ${row.document.title || ''}`.trim();
  }
  if (row.record?.task?.template) {
    return row.record.task.template.title;
  }
  return row.recordId || row.documentId || '-';
};

const getSubmitterName = (row: Approval): string => {
  if (row.record?.submitter) return row.record.submitter.name;
  if (row.document?.creator) return row.document.creator.name;
  return '-';
};

const getSubmitterInitial = (row: Approval): string => {
  const name = getSubmitterName(row);
  return name.charAt(0) || 'U';
};

const getApprovalTypeLabel = (type?: string): string => {
  const labels: Record<string, string> = {
    single: '单人',
    countersign: '会签',
    sequential: '顺签',
  };
  return labels[type || 'single'] || '单人';
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await approvalApi.getApprovalHistory(currentPage.value, pageSize.value);
    const data = res as unknown as { list: Approval[]; total: number };

    if (filterStatus.value) {
      tableData.value = (data.list || []).filter((row) => row.status === filterStatus.value);
    } else {
      tableData.value = data.list || [];
    }

    total.value = data.total || 0;
  } catch {
    ElMessage.error('获取审批历史失败');
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = () => {
  currentPage.value = 1;
  fetchData();
};

const handleView = (row: Approval) => {
  router.push(`/approvals/detail/${row.id}`);
};

onMounted(fetchData);
</script>

<style scoped>
.approval-history-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --success: #27ae60;
  --danger: #e74c3c;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  --bg: #f5f6fa;
  font-family: 'Inter', sans-serif;
}

.page-header { margin-bottom: 24px; }

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 4px;
}

.page-subtitle { font-size: 14px; color: var(--text-light); margin: 0; }

.table-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-wrap { display: flex; align-items: center; gap: 12px; }

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.total-text { font-size: 13px; color: var(--text-light); }

.filter-wrap { display: flex; gap: 12px; align-items: center; }

.history-table :deep(th) {
  background: #fafafa;
  font-weight: 500;
  color: var(--text-light);
  font-size: 12px;
}

.source-text { font-size: 14px; color: var(--text); }

.creator-info { display: flex; align-items: center; gap: 8px; }

.creator-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--primary);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.comment-text { font-size: 13px; color: var(--text-light); }
.rejection-text { font-size: 13px; color: var(--danger); }
.empty-text { font-size: 13px; color: #ccc; }
.time-text { font-size: 12px; color: var(--text-light); }

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>