<template>
  <div class="dashboard-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">执行门户</p>
        <div class="hero-title-row">
          <h1>今天先把到期任务清掉</h1>
          <el-tag class="shift-chip" effect="plain" round>{{ currentDateLabel }}</el-tag>
        </div>
        <p class="hero-description">
          首页只保留执行者真正需要的视角：先处理到期项，再处理高风险项，最后回看协同和资料。
        </p>
        <div class="hero-actions">
          <el-button type="primary" @click="router.push('/my-todos')">进入全部待办</el-button>
          <el-button plain @click="router.push('/record-tasks/my')">查看待填任务</el-button>
        </div>
      </div>

      <div class="hero-brief">
        <div class="brief-label">当前班次</div>
        <div class="brief-value">{{ userStore.user?.name || '当前用户' }}</div>
        <div class="brief-meta">
          <span>{{ pendingTodos.length }} 个待处理</span>
          <span>{{ overdueTodos.length }} 个已逾期</span>
        </div>
      </div>
    </section>

    <section class="summary-grid">
      <article v-for="item in summaryCards" :key="item.label" class="summary-card">
        <div class="summary-icon" :class="`tone-${item.tone}`">
          <el-icon><component :is="item.icon" /></el-icon>
        </div>
        <div class="summary-body">
          <p class="summary-label">{{ item.label }}</p>
          <p class="summary-value">{{ item.value }}</p>
          <p class="summary-note">{{ item.note }}</p>
        </div>
      </article>
    </section>

    <section class="content-grid">
      <div class="primary-column">
        <article v-loading="loading" class="panel app-panel queue-panel">
          <div class="panel-header">
            <div>
              <p class="panel-kicker">主队列</p>
              <h2>混合任务队列</h2>
            </div>
            <el-radio-group v-model="queueFilter" size="small" class="queue-filter">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="due">到期优先</el-radio-button>
              <el-radio-button label="risk">高风险</el-radio-button>
            </el-radio-group>
          </div>

          <div v-if="queueItems.length" class="queue-list">
            <article v-for="todo in queueItems" :key="todo.id" class="queue-item">
              <div class="queue-main">
                <div class="queue-meta">
                  <el-tag size="small" effect="plain">{{ todoTypeLabels[todo.type] ?? todo.type }}</el-tag>
                  <el-tag size="small" :type="priorityTagTypes[todo.priority]">
                    {{ priorityText[todo.priority] ?? todo.priority }}
                  </el-tag>
                  <span class="queue-deadline" :class="deadlineClass(todo)">
                    {{ formatDueLabel(todo.dueDate) }}
                  </span>
                </div>

                <h3>{{ todo.title }}</h3>
                <p>{{ todo.description || '该任务暂无补充说明，进入详情后继续处理。' }}</p>

                <div class="queue-submeta">
                  <span>创建于 {{ formatDate(todo.createdAt) }}</span>
                </div>
              </div>

              <div class="queue-actions">
                <el-button
                  v-if="todo.status === 'pending' && todo.type !== 'approval_task'"
                  type="primary"
                  :loading="completingId === todo.id"
                  @click="handleComplete(todo)"
                >
                  完成
                </el-button>
                <el-button
                  plain
                  :disabled="!todo.actionRoute"
                  @click="handleGoto(todo)"
                >
                  去处理
                </el-button>
              </div>
            </article>
          </div>

          <el-empty v-else description="当前没有待处理任务" :image-size="72" />
        </article>

        <article class="panel recent-panel">
          <div class="panel-header">
            <div>
              <p class="panel-kicker">辅助信息</p>
              <h2>最近完成与资料</h2>
            </div>
            <el-button text @click="router.push('/documents')">打开文档中心</el-button>
          </div>

          <div class="secondary-grid">
            <section class="mini-block">
              <div class="mini-block-header">
                <h3>最近文档</h3>
                <span>{{ recentDocs.length }} 条</span>
              </div>
              <div v-if="recentDocs.length" class="doc-list">
                <button
                  v-for="doc in recentDocs"
                  :key="doc.id"
                  class="doc-row"
                  type="button"
                  @click="router.push(`/documents/${doc.id}`)"
                >
                  <span class="doc-row-title">{{ doc.title }}</span>
                  <span class="doc-row-meta">{{ doc.number || '未编号' }} · {{ formatDate(doc.createdAt) }}</span>
                </button>
              </div>
              <el-empty v-else description="暂无文档" :image-size="52" />
            </section>

            <section class="mini-block">
              <div class="mini-block-header">
                <h3>最近完成</h3>
                <span>{{ completedPreview.length }} 条</span>
              </div>
              <div v-if="completedPreview.length" class="done-list">
                <div v-for="todo in completedPreview" :key="todo.id" class="done-row">
                  <div>
                    <p class="done-title">{{ todo.title }}</p>
                    <p class="done-meta">{{ todoTypeLabels[todo.type] ?? todo.type }}</p>
                  </div>
                  <span class="done-date">{{ formatDate(todo.completedAt || todo.createdAt) }}</span>
                </div>
              </div>
              <el-empty v-else description="暂无已完成记录" :image-size="52" />
            </section>
          </div>
        </article>
      </div>

      <aside class="side-column">
        <article class="panel alert-panel">
          <div class="panel-header compact">
            <div>
              <p class="panel-kicker">异常提醒</p>
              <h2>先处理这些</h2>
            </div>
            <el-button text @click="router.push('/my-todos')">全部查看</el-button>
          </div>

          <div v-if="focusAlerts.length" class="alert-list">
            <div v-for="alert in focusAlerts" :key="alert.id" class="alert-row">
              <div class="alert-marker"></div>
              <div class="alert-body">
                <p class="alert-title">{{ alert.title }}</p>
                <p class="alert-meta">
                  {{ todoTypeLabels[alert.type] ?? alert.type }} · {{ formatDueLabel(alert.dueDate) }}
                </p>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无异常提醒" :image-size="52" />
        </article>

        <article class="panel shortcuts-panel">
          <div class="panel-header compact">
            <div>
              <p class="panel-kicker">高频入口</p>
              <h2>常用动作</h2>
            </div>
          </div>

          <div class="shortcut-list">
            <button
              v-for="action in quickActions"
              :key="action.path"
              type="button"
              class="shortcut-item"
              @click="router.push(action.path)"
            >
              <span class="shortcut-icon" :class="`tone-${action.tone}`">
                <el-icon><component :is="action.icon" /></el-icon>
              </span>
              <span class="shortcut-copy">
                <span class="shortcut-title">{{ action.label }}</span>
                <span class="shortcut-desc">{{ action.description }}</span>
              </span>
            </button>
          </div>
        </article>

        <article class="panel approval-panel">
          <div class="panel-header compact">
            <div>
              <p class="panel-kicker">协同压力</p>
              <h2>待审批</h2>
            </div>
            <span class="panel-count">{{ pendingApprovals.length }}</span>
          </div>

          <div v-if="pendingApprovals.length" class="approval-list">
            <div v-for="doc in pendingApprovals.slice(0, 4)" :key="doc.id" class="approval-row">
              <div class="approval-avatar">{{ doc.creator?.name?.charAt(0) || 'U' }}</div>
              <div class="approval-copy">
                <p>{{ doc.title }}</p>
                <span>{{ doc.creator?.name || '未知提交人' }} · {{ formatDate(doc.createdAt) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="当前无待审批" :image-size="52" />
        </article>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { useTodoStore } from '@/stores/todo';
import request from '@/api/request';
import { todoApi } from '@/api/todo';
import type { TodoItem, TodoPriority, TodoType } from '@/types/todo';
import {
  todoTypeLabels,
  priorityWeights,
  priorityTagTypes,
  priorityText,
  formatDueLabel,
  compareTodosByDueThenRisk,
} from '@/utils/todoPresentation';
import {
  AlarmClock,
  ArrowRight,
  CircleCheckFilled,
  Clock,
  EditPen,
  Files,
  Finished,
  List,
  Notification,
} from '@element-plus/icons-vue';

interface DocumentItem {
  id: string;
  title: string;
  number?: string | null;
  createdAt: string;
}

interface ApprovalItem {
  id: string;
  title: string;
  createdAt: string;
  creator?: { name?: string | null } | null;
}

type QueueFilter = 'all' | 'due' | 'risk';

const router = useRouter();
const userStore = useUserStore();
const todoStore = useTodoStore();

const currentDateLabel = new Date().toLocaleDateString('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

const queueFilter = ref<QueueFilter>('all');
const loading = ref(false);
const completingId = ref<string | null>(null);

const pendingTodos = ref<TodoItem[]>([]);
const completedPreview = ref<TodoItem[]>([]);
const recentDocs = ref<DocumentItem[]>([]);
const pendingApprovals = ref<ApprovalItem[]>([]);


const quickActions = [
  {
    path: '/record-tasks/my',
    label: '待填记录',
    description: '直接进入记录任务列表',
    icon: EditPen,
    tone: 'amber',
  },
  {
    path: '/my-todos',
    label: '全部待办',
    description: '查看完整混合任务队列',
    icon: List,
    tone: 'blue',
  },
  {
    path: '/approvals/pending',
    label: '待我审批',
    description: '处理审批与复核任务',
    icon: Finished,
    tone: 'red',
  },
  {
    path: '/traceability',
    label: '追溯查询',
    description: '定位批次与链路问题',
    icon: ArrowRight,
    tone: 'ink',
  },
  {
    path: '/documents',
    label: '体系文件',
    description: '快速打开常用制度文件',
    icon: Files,
    tone: 'green',
  },
  {
    path: '/notifications',
    label: '消息中心',
    description: '查看系统提醒与通知',
    icon: Notification,
    tone: 'slate',
  },
];

const overdueTodos = computed(() => pendingTodos.value.filter((todo) => isOverdue(todo.dueDate)));
const dueTodayTodos = computed(() => pendingTodos.value.filter((todo) => isToday(todo.dueDate)));
const urgentTodos = computed(() => pendingTodos.value.filter((todo) => priorityWeights[todo.priority] >= 2));

const summaryCards = computed(() => [
  {
    label: '待处理',
    value: String(pendingTodos.value.length),
    note: '当前挂在你名下的执行项',
    icon: List,
    tone: 'blue',
  },
  {
    label: '今天到期',
    value: String(dueTodayTodos.value.length),
    note: '优先清理今天必须完成的事项',
    icon: Clock,
    tone: 'amber',
  },
  {
    label: '已逾期',
    value: String(overdueTodos.value.length),
    note: '需要立即处理或说明阻塞原因',
    icon: AlarmClock,
    tone: 'red',
  },
  {
    label: '高风险项',
    value: String(urgentTodos.value.length),
    note: '风险等级高于常规的待办',
    icon: CircleCheckFilled,
    tone: 'ink',
  },
]);

const sortedTodos = computed(() =>
  [...pendingTodos.value].sort(compareTodosByDueThenRisk),
);

const queueItems = computed(() => {
  if (queueFilter.value === 'risk') {
    return sortedTodos.value.filter((todo) => priorityWeights[todo.priority] >= 2).slice(0, 8);
  }
  if (queueFilter.value === 'due') {
    return sortedTodos.value.filter((todo) => todo.dueDate).slice(0, 8);
  }
  return sortedTodos.value.slice(0, 8);
});

const focusAlerts = computed(() =>
  sortedTodos.value
    .filter((todo) => isOverdue(todo.dueDate) || priorityWeights[todo.priority] >= 2)
    .slice(0, 4),
);

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseDate(input: string | null): Date | null {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dayDiff(input: string | null): number | null {
  const date = parseDate(input);
  if (!date) return null;
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(date).getTime();
  return Math.round((target - today) / 86400000);
}

function isOverdue(input: string | null): boolean {
  const diff = dayDiff(input);
  return diff !== null && diff < 0;
}

function isToday(input: string | null): boolean {
  return dayDiff(input) === 0;
}

function formatDate(input: string): string {
  return new Date(input).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function deadlineClass(todo: TodoItem): string {
  if (isOverdue(todo.dueDate)) return 'danger';
  if (isToday(todo.dueDate)) return 'warning';
  return 'muted';
}

function resolveCompleteError(err: unknown): string {
  const status = (err as { status?: number; code?: number } | undefined)?.status
    ?? (err as { status?: number; code?: number } | undefined)?.code;
  if (status === 404) return '待办不存在';
  if (status === 409) return '该待办已完成';
  return '操作失败，请重试';
}

async function handleComplete(todo: TodoItem) {
  completingId.value = todo.id;
  try {
    await todoApi.complete(todo.id);
    ElMessage.success('已完成');
    await fetchDashboard();
    await todoStore.refreshPendingCount();
  } catch (err) {
    ElMessage.error(resolveCompleteError(err));
  } finally {
    completingId.value = null;
  }
}

function handleGoto(todo: TodoItem) {
  if (todo.actionRoute) {
    router.push(todo.actionRoute);
  }
}

async function fetchDashboard() {
  loading.value = true;
  const [pendingTodosRes, completedTodosRes, docsRes, approvalsRes] = await Promise.allSettled([
    todoApi.list({ status: 'pending', type: 'all', page: 1, limit: 50 }),
    todoApi.list({ status: 'completed', type: 'all', page: 1, limit: 6 }),
    request.get<{ list: DocumentItem[] }>('/documents', { params: { limit: 4 } }),
    request.get<{ list: ApprovalItem[] }>('/documents/pending-approvals'),
  ]);

  if (pendingTodosRes.status === 'fulfilled') {
    pendingTodos.value = pendingTodosRes.value.items || [];
  } else {
    pendingTodos.value = [];
    ElMessage.error('获取待办失败');
  }

  if (completedTodosRes.status === 'fulfilled') {
    completedPreview.value = completedTodosRes.value.items || [];
  } else {
    completedPreview.value = [];
  }

  if (docsRes.status === 'fulfilled') {
    recentDocs.value = docsRes.value.list || [];
  } else {
    recentDocs.value = [];
  }

  if (approvalsRes.status === 'fulfilled') {
    pendingApprovals.value = approvalsRes.value.list || [];
  } else {
    pendingApprovals.value = [];
  }

  loading.value = false;
}

onMounted(async () => {
  await fetchDashboard();
  todoStore.refreshPendingCount();
});
</script>

<style scoped>
.dashboard-page {
  min-height: calc(100vh - 64px);
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(196, 154, 74, 0.08), transparent 28%),
    linear-gradient(180deg, #f7f3ec 0%, #f1efe9 100%);
  color: #1f2328;
}

.hero-panel,
.panel,
.summary-card {
  border: 1px solid rgba(39, 47, 54, 0.08);
  box-shadow: 0 18px 40px rgba(24, 31, 36, 0.06);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.8fr);
  gap: 20px;
  padding: 28px;
  border-radius: 20px;
  background: linear-gradient(135deg, #fcfbf8 0%, #f1ece2 100%);
  margin-bottom: 20px;
}

.eyebrow,
.panel-kicker,
.brief-label {
  font-size: 12px;
  line-height: 1.4;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b7355;
}

.hero-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 8px 0 12px;
}

.hero-title-row h1 {
  margin: 0;
  font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
  font-size: 36px;
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: 0;
  color: #22252a;
}

.shift-chip {
  flex-shrink: 0;
  border-color: rgba(139, 115, 85, 0.2);
  color: #6f5841;
  background: rgba(255, 255, 255, 0.72);
}

.hero-description {
  max-width: 720px;
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: #59626b;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.hero-brief {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  border-radius: 18px;
  background: #1d252d;
  color: #f8f3ea;
}

.brief-value {
  margin-top: 12px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.brief-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: rgba(248, 243, 234, 0.72);
  font-size: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card,
.panel {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(14px);
}

.summary-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px;
  border-radius: 18px;
}

.summary-icon,
.shortcut-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  flex-shrink: 0;
}

.summary-icon {
  width: 46px;
  height: 46px;
  font-size: 20px;
}

.summary-label,
.summary-note,
.summary-value,
.panel-header h2,
.queue-item h3,
.queue-item p,
.queue-submeta,
.doc-row-title,
.doc-row-meta,
.done-title,
.done-meta,
.done-date,
.alert-title,
.alert-meta,
.shortcut-title,
.shortcut-desc,
.approval-copy p,
.approval-copy span {
  margin: 0;
}

.summary-label {
  font-size: 13px;
  color: #6b7280;
}

.summary-value {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 700;
  color: #1f2328;
}

.summary-note {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #7c8690;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.85fr);
  gap: 20px;
}

.primary-column,
.side-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel {
  border-radius: 20px;
  padding: 20px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-header.compact {
  margin-bottom: 14px;
}

.panel-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1f2328;
}

.queue-filter :deep(.el-radio-button__inner) {
  min-width: 72px;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.queue-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 18px;
  border: 1px solid rgba(31, 35, 40, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 245, 239, 0.94) 100%);
}

.queue-meta,
.queue-submeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.queue-meta {
  margin-bottom: 10px;
}

.queue-item h3 {
  font-size: 18px;
  line-height: 1.35;
  color: #1f2328;
}

.queue-item p {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: #5c6670;
}

.queue-submeta {
  margin-top: 12px;
  font-size: 12px;
  color: #8a949e;
}

.queue-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 104px;
}

.queue-deadline {
  font-size: 12px;
  font-weight: 600;
}

.queue-deadline.danger {
  color: #b42318;
}

.queue-deadline.warning {
  color: #b26a00;
}

.queue-deadline.muted {
  color: #6b7280;
}

.secondary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.mini-block {
  padding: 16px;
  border-radius: 18px;
  background: #f8f5ef;
  border: 1px solid rgba(31, 35, 40, 0.06);
}

.mini-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mini-block-header h3 {
  margin: 0;
  font-size: 16px;
  color: #252b31;
}

.mini-block-header span {
  font-size: 12px;
  color: #7c8690;
}

.doc-list,
.done-list,
.alert-list,
.approval-list,
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.doc-row,
.shortcut-item {
  width: 100%;
  border: none;
  text-align: left;
  cursor: pointer;
}

.doc-row {
  padding: 12px;
  border-radius: 14px;
  background: #ffffff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.doc-row:hover,
.shortcut-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(24, 31, 36, 0.08);
}

.doc-row-title,
.done-title,
.alert-title,
.approval-copy p,
.shortcut-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}

.doc-row-meta,
.done-meta,
.done-date,
.alert-meta,
.approval-copy span,
.shortcut-desc {
  margin-top: 4px;
  display: block;
  font-size: 12px;
  line-height: 1.5;
  color: #7c8690;
}

.done-row,
.approval-row,
.alert-row,
.shortcut-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: #f8f5ef;
}

.done-row {
  justify-content: space-between;
}

.alert-marker {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: #c54b34;
  flex-shrink: 0;
}

.shortcut-icon {
  width: 40px;
  height: 40px;
  font-size: 18px;
}

.shortcut-copy {
  display: flex;
  flex-direction: column;
}

.approval-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #1d252d;
  color: #f8f3ea;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.panel-count {
  min-width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f3e9d7;
  color: #7f5a24;
  font-weight: 700;
}

.tone-blue {
  background: rgba(58, 110, 165, 0.12);
  color: #295b90;
}

.tone-amber {
  background: rgba(191, 131, 32, 0.14);
  color: #9b6200;
}

.tone-red {
  background: rgba(197, 75, 52, 0.13);
  color: #b42318;
}

.tone-ink {
  background: rgba(29, 37, 45, 0.1);
  color: #1d252d;
}

.tone-green {
  background: rgba(56, 121, 92, 0.12);
  color: #2f6f52;
}

.tone-slate {
  background: rgba(104, 119, 136, 0.14);
  color: #52606f;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid,
  .hero-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .dashboard-page {
    padding: 16px;
  }

  .hero-title-row,
  .panel-header,
  .queue-item,
  .secondary-grid {
    grid-template-columns: 1fr;
  }

  .hero-title-row,
  .panel-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .queue-actions {
    min-width: 0;
    flex-direction: row;
    width: 100%;
  }

  .queue-actions :deep(.el-button) {
    flex: 1;
  }
}
</style>
