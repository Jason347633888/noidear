<template>
  <div class="notification-list">
    <el-card class="tabs-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="未读" name="unread" />
      </el-tabs>
    </el-card>

    <el-card class="list-card">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column width="50">
          <template #default="{ row }">
            <el-icon v-if="!row.isRead" class="unread-dot"><BellFilled /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { BellFilled } from '@element-plus/icons-vue';
import request from '@/api/request';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const router = useRouter();
const loading = ref(false);
const activeTab = ref('all');
const tableData = ref<Notification[]>([]);
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');
const getTypeTag = (type: string) => ({ task: 'primary', approval: 'warning', reminder: 'info' }[type] || 'info');
const getTypeText = (type: string) => ({ task: '任务', approval: '审批', reminder: '提醒' }[type] || type);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: Notification[]; total: number; unreadCount: number }>('/notifications', {
      params: { page: pagination.page, limit: pagination.limit, unreadOnly: activeTab.value === 'unread' },
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch { ElMessage.error('获取消息失败'); }
  finally { loading.value = false; }
};

const handleTabChange = () => { pagination.page = 1; fetchData(); };
const handleView = async (row: Notification) => {
  if (!row.isRead) {
    await request.post(`/notifications/${row.id}/read`);
    row.isRead = true;
  }
  router.push('/notifications');
};

onMounted(() => fetchData());
</script>

<style scoped>
.notification-list { padding: 0; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.unread-dot { color: #f56c6c; }
</style>
