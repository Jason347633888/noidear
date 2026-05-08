<template>
  <div class="approval-history-page">
    <PageHeaderBlock eyebrow="文控与审批" title="审批历史" description="查看已处理的审批记录" />

    <div class="app-panel table-card">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">已处理审批<span class="total-text">共 {{ actions.length }} 条</span></h3>
        <div class="app-panel-header__actions">
            <el-select v-model="filterAction" placeholder="全部结果" clearable style="width: 140px" size="default">
              <el-option label="全部结果" value="" />
              <el-option label="已通过" value="approve" />
              <el-option label="已驳回" value="reject" />
            </el-select>
        </div>
      </div>

      <el-table :data="filteredActions" v-loading="loading" stripe class="history-table">
        <el-table-column label="审批事项" min-width="200">
          <template #default="{ row }">
            <span class="source-text">{{ row.task?.stepName ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关联业务" min-width="160">
          <template #default="{ row }">
            <span>{{ row.instance?.title ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="审批结果" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.action === 'approve' ? 'success' : 'danger'">
              {{ row.action === 'approve' ? '已通过' : '已驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批意见" min-width="150">
          <template #default="{ row }">
            <span v-if="row.comment" class="comment-text">{{ row.comment }}</span>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column label="处理时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.task?.id"
              link
              type="primary"
              @click="router.push(`/approvals/detail/${row.task.id}`)"
            >
              <el-icon><View /></el-icon>详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !filteredActions.length" description="暂无已处理的审批记录" :image-size="120" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { View } from '@element-plus/icons-vue';
import { unifiedApprovalApi } from '@/api/unified-approval';

const router = useRouter();
const loading = ref(false);
const filterAction = ref('');
const actions = ref<any[]>([]);

const filteredActions = computed(() =>
  filterAction.value ? actions.value.filter((r) => r.action === filterAction.value) : actions.value,
);

function formatDate(date?: string): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}

async function load() {
  loading.value = true;
  try {
    actions.value = await unifiedApprovalApi.history();
  } catch {
    ElMessage.error('获取审批历史失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.approval-history-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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
  font-size: 18px;
  font-weight: 600;
  color: var(--shell-ink);
}

.total-text { font-size: 13px; color: var(--shell-muted); }

.filter-wrap { display: flex; gap: 12px; align-items: center; }

.history-table :deep(th) {
  background: #fafafa;
  font-weight: 500;
  color: var(--shell-muted);
  font-size: 12px;
}

.source-text { font-size: 14px; color: var(--shell-ink); }

.comment-text { font-size: 13px; color: var(--shell-muted); }
.empty-text { font-size: 13px; color: #ccc; }
.time-text { font-size: 12px; color: var(--shell-muted); }
</style>
