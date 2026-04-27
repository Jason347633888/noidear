<template>
  <div class="document-control-issue-list">
    <el-card>
      <template #header>
        <div class="header">
          <div>
            <strong>{{ issueTitle }}</strong>
            <span class="total">共 {{ total }} 条</span>
          </div>
          <el-button size="small" @click="fetchIssues">刷新</el-button>
        </div>
      </template>

      <el-empty v-if="!loading && items.length === 0" description="暂无问题" />

      <el-table v-else :data="items" v-loading="loading" stripe>
        <el-table-column label="严重度" width="100">
          <template #default="{ row }">
            <el-tag :type="severityType(row.severity)">{{ severityText(row.severity) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="问题" min-width="180" />
        <el-table-column prop="description" label="说明" min-width="260" show-overflow-tooltip />
        <el-table-column prop="sourceLabel" label="来源" min-width="160" />
        <el-table-column label="发现时间" width="140">
          <template #default="{ row }">{{ formatDate(row.detectedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button :data-test="`issue-action-${row.id}`" type="primary" size="small" @click="openAction(row.actionRoute)">
              {{ row.actionLabel }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        class="pagination"
        :current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  documentControlApi,
  type WorkbenchIssueItem,
  type WorkbenchIssueType,
} from '@/api/document-control';

const route = useRoute();
const router = useRouter();

const issueTitles: Record<WorkbenchIssueType, string> = {
  pendingReview: '待审核',
  dueForReview: '即将复审',
  expiringExternalFiles: '外来文件到期',
  obsoleteReferences: '作废仍被引用',
  brokenReferences: '入口失效',
  missingLandingTargets: '表单入口缺失',
  missingMetadata: '元数据缺失',
  trainingNeeds: '培训需求未处理',
  openImpactItems: '影响项未关闭',
};

const validTypes = Object.keys(issueTitles) as WorkbenchIssueType[];
const loading = ref(false);
const items = ref<WorkbenchIssueItem[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);

const issueType = computed<WorkbenchIssueType>(() => {
  const value = route.query.type as WorkbenchIssueType | undefined;
  return value && validTypes.includes(value) ? value : 'missingMetadata';
});

const issueTitle = computed(() => issueTitles[issueType.value]);

async function fetchIssues() {
  loading.value = true;
  try {
    const result = await documentControlApi.listWorkbenchIssues({
      type: issueType.value,
      page: page.value,
      limit: limit.value,
      days: 30,
    });
    items.value = result.items;
    total.value = result.total;
    page.value = result.page;
    limit.value = result.limit;
  } catch {
    ElMessage.error('加载问题列表失败');
  } finally {
    loading.value = false;
  }
}

function severityType(severity: string) {
  if (severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  return 'info';
}

function severityText(severity: string) {
  if (severity === 'high') return '高';
  if (severity === 'medium') return '中';
  return '低';
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('zh-CN');
}

function openAction(actionRoute: string) {
  router.push(actionRoute);
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  fetchIssues();
}

watch(issueType, () => {
  page.value = 1;
  fetchIssues();
});

onMounted(fetchIssues);
</script>

<style scoped>
.document-control-issue-list {
  padding: 16px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.total {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
