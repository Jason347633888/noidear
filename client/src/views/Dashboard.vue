<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="greeting">
          <span class="greeting-text">工作台</span>
          <span class="greeting-sub">Document Management System</span>
        </div>
        <div class="header-meta">
          <span class="date">{{ currentDate }}</span>
          <span class="welcome">欢迎回来，{{ userStore.user?.name }}</span>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label" :style="{ '--accent': stat.color }">
        <div class="stat-icon">
          <el-icon><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
        <div class="stat-decoration"></div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="dashboard-content">
      <!-- Quick Actions -->
      <el-card class="quick-actions">
        <template #header>
          <div class="card-header">
            <span class="card-title">快捷操作</span>
          </div>
        </template>
        <div class="action-grid">
          <div class="action-item" v-for="action in quickActions" :key="action.path" @click="$router.push(action.path)">
            <div class="action-icon" :style="{ background: action.color }">
              <el-icon><component :is="action.icon" /></el-icon>
            </div>
            <span class="action-text">{{ action.label }}</span>
          </div>
        </div>
      </el-card>

      <!-- Recent Documents -->
      <el-card class="recent-docs">
        <template #header>
          <div class="card-header">
            <span class="card-title">最近文档</span>
            <el-button text type="primary" @click="$router.push('/documents/level1')">查看全部</el-button>
          </div>
        </template>
        <div class="doc-list" v-if="recentDocs.length">
          <div class="doc-item" v-for="doc in recentDocs" :key="doc.id" @click="$router.push(`/documents/${doc.id}`)">
            <div class="doc-icon" :class="`level-${doc.level}`">
              <el-icon><Document /></el-icon>
            </div>
            <div class="doc-info">
              <div class="doc-title">{{ doc.title }}</div>
              <div class="doc-meta">{{ doc.number }} · {{ formatDate(doc.createdAt) }}</div>
            </div>
            <el-tag :type="getStatusType(doc.status)" size="small">{{ getStatusText(doc.status) }}</el-tag>
          </div>
        </div>
        <el-empty v-else description="暂无文档" :image-size="80" />
      </el-card>
    </div>

    <!-- Pending Approvals -->
    <el-card class="pending-approvals" v-if="pendingApprovals.length">
      <template #header>
        <div class="card-header">
          <span class="card-title">待审批</span>
          <el-badge :value="pendingApprovals.length" :max="99" class="approval-badge">
            <el-button text type="primary" @click="$router.push('/approvals')">查看全部</el-button>
          </el-badge>
        </div>
      </template>
      <div class="approval-list">
        <div class="approval-item" v-for="doc in pendingApprovals.slice(0, 5)" :key="doc.id">
          <div class="approval-avatar">
            {{ doc.creator?.name?.charAt(0) || 'U' }}
          </div>
          <div class="approval-info">
            <div class="approval-title">{{ doc.title }}</div>
            <div class="approval-meta">
              <span>{{ doc.creator?.name }}</span>
              <span class="dot">·</span>
              <span>{{ formatDate(doc.createdAt) }}</span>
            </div>
          </div>
          <el-button type="primary" size="small" @click="$router.push(`/documents/${doc.id}`)">审批</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { request } from '@/api/request';
import {
  Document, Folder, Task, CheckCircle,
  Upload, Files, CircleCheck, Bell
} from '@element-plus/icons-vue';

const userStore = useUserStore();
const currentDate = new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });

const stats = ref([
  { label: '文档总数', value: '128', icon: 'Document', color: '#c9a227' },
  { label: '待审批', value: '5', icon: 'CircleCheck', color: '#e74c3c' },
  { label: '进行中任务', value: '12', icon: 'Task', color: '#3498db' },
  { label: '已完成', value: '89', icon: 'CheckCircle', color: '#27ae60' },
]);

const quickActions = [
  { path: '/documents/upload/1', label: '上传一级文件', icon: 'Upload', color: 'linear-gradient(135deg, #c9a227 0%, #d4af37 100%)' },
  { path: '/tasks/create', label: '创建任务', icon: 'Task', color: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)' },
  { path: '/templates', label: '模板管理', icon: 'Files', color: 'linear-gradient(135deg, #9b59b6 0%, #a569bd 100%)' },
  { path: '/notifications', label: '消息中心', icon: 'Bell', color: 'linear-gradient(135deg, #e74c3c 0%, #ec7063 100%)' },
];

const recentDocs = ref<any[]>([]);
const pendingApprovals = ref<any[]>([]);

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');
const getStatusType = (status: string) => ({ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger' }[status] || 'info');
const getStatusText = (status: string) => ({ draft: '草稿', pending: '待审批', approved: '已发布', rejected: '已驳回' }[status] || status);

const fetchData = async () => {
  try {
    const docsRes = await request.get<any[]>('/documents', { params: { limit: 5 } });
    recentDocs.value = docsRes.list || [];
    const approvalsRes = await request.get<any[]>('/documents/pending-approvals');
    pendingApprovals.value = approvalsRes || [];
    stats.value[1].value = String(pendingApprovals.value.length);
  } catch { /* silent fail */ }
};

onMounted(fetchData);
</script>

<style scoped>
.dashboard {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --bg: #f8f9fa;
  --card-bg: #ffffff;
  --text: #2c3e50;
  --text-light: #7f8c8d;
}

.dashboard {
  min-height: calc(100vh - 100px);
  background: var(--bg);
  padding: 24px;
}

.dashboard-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.greeting-text {
  font-family: 'Cormorant Garamond', serif;
  font-size: 32px;
  font-weight: 600;
  color: var(--primary);
  display: block;
}

.greeting-sub {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--text-light);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.header-meta {
  text-align: right;
  font-family: 'Inter', sans-serif;
}

.header-meta .date {
  display: block;
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

.header-meta .welcome {
  font-size: 12px;
  color: var(--text-light);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-family: 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  line-height: 1.2;
}

.stat-label {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.stat-decoration {
  position: absolute;
  right: -20px;
  bottom: -20px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.1;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.quick-actions {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  border-radius: 10px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-item:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  margin-bottom: 8px;
}

.action-text {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--text);
}

.recent-docs {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.doc-item:hover {
  background: #f8f9fa;
}

.doc-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.doc-icon.level-1 { background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); }
.doc-icon.level-2 { background: linear-gradient(135deg, #3498db 0%, #5dade2 100%); }
.doc-icon.level-3 { background: linear-gradient(135deg, #9b59b6 0%, #a569bd 100%); }

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-meta {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.pending-approvals {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.approval-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.approval-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
}

.approval-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Cormorant Garamond', serif;
  font-size: 16px;
  font-weight: 600;
}

.approval-info {
  flex: 1;
}

.approval-title {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.approval-meta {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.approval-meta .dot {
  margin: 0 6px;
}

.approval-badge :deep(.el-badge__content) {
  background: var(--accent);
}

@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-content { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .header-content { flex-direction: column; align-items: flex-start; gap: 12px; }
  .header-meta { text-align: left; }
}
</style>
