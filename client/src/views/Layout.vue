<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapsed ? '72px' : '260px'" class="aside">
      <div class="logo">
        <div class="logo-icon">
          <el-icon :size="24"><Document /></el-icon>
        </div>
        <transition name="fade">
          <span v-if="!isCollapsed" class="logo-text">质量管理</span>
        </transition>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        router
        class="aside-menu"
        background-color="transparent"
        text-color="#4a5568"
        active-text-color="#c9a227"
      >
        <template v-for="item in menuItems" :key="item.title">
          <el-menu-item v-if="!item.children" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
          <el-sub-menu v-else :index="item.title">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="child.path"
            >
              <el-icon><component :is="child.icon" /></el-icon>
              <template #title>{{ child.title }}</template>
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>

      <div class="aside-footer" v-if="!isCollapsed">
        <div class="version">v1.0.0</div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <div class="collapse-btn" @click="isCollapsed = !isCollapsed">
            <el-icon>
              <Fold v-if="!isCollapsed" />
              <Expand v-else />
            </el-icon>
          </div>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
            <div class="icon-btn" @click="router.push('/notifications')">
              <el-icon :size="18"><Bell /></el-icon>
            </div>
          </el-badge>

          <el-dropdown trigger="click" @command="handleCommand" class="user-dropdown">
            <div class="user-info">
              <div class="user-avatar">
                {{ userStore.user?.name?.charAt(0) || 'U' }}
              </div>
              <span class="user-name">{{ userStore.user?.name || '用户' }}</span>
              <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="user-dropdown-menu">
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Lock /></el-icon>修改密码
                </el-dropdown-item>
                <el-dropdown-item divided command="logout" class="logout-item">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import {
  Document, Fold, Expand, Bell, ArrowDown,
  User, Lock, SwitchButton, HomeFilled, Files,
  Grid, List, CircleCheck, Message, UserFilled,
  DataAnalysis, Setting, Connection, Box, Goods, Key,
  SetUp, WarnTriangleFilled, Monitor, Cloudy, Search, Odometer, Delete,
} from '@element-plus/icons-vue';

import request from '@/api/request';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const isCollapsed = ref(false);
const unreadCount = ref(0);

const activeMenu = computed(() => route.path);
const currentTitle = computed(() => route.meta.title as string || '');

const menuItems = [
  { path: '/dashboard', title: '工作台', icon: HomeFilled },
  {
    title: '文档管理',
    icon: Files,
    children: [
      { path: '/documents', title: '文档列表', icon: Document },
      { path: '/templates', title: '模板管理', icon: Grid },
    ],
  },
  {
    title: '审批与工作流',
    icon: CircleCheck,
    children: [
      { path: '/approvals/pending', title: '待我审批', icon: CircleCheck },
      { path: '/approvals/history', title: '审批历史', icon: CircleCheck },
      { path: '/workflow/my-tasks', title: '工作流待办', icon: Connection },
      { path: '/workflow/instances', title: '工作流实例', icon: Connection },
      { path: '/workflow/templates', title: '工作流模板', icon: Connection },
      { path: '/workflow-templates/designer', title: '流程设计器', icon: Connection },
    ],
  },
  {
    title: '产品研发',
    icon: Grid,
    children: [
      { path: '/products', title: '产品目录', icon: Goods },
      { path: '/recipes', title: '配方管理', icon: List },
      { path: '/process', title: '研发流程列表', icon: List },
    ],
  },
  {
    title: '生产管理',
    icon: List,
    children: [
      { path: '/records', title: '记录管理', icon: Document },
      { path: '/record-tasks/my', title: '待填任务', icon: List },
      { path: '/record-tasks/manage', title: '任务配置', icon: Setting },
      { path: '/batch-trace', title: '批次列表', icon: Box },
      { path: '/batch-trace/query', title: '批次追溯查询', icon: Search },
      { path: '/batch-trace/report', title: '追溯报告', icon: Document },
      { path: '/production/workshop-staging', title: '车间暂存区', icon: Grid },
      { path: '/warehouse/requisitions', title: '领料管理', icon: Goods },
      { path: '/warehouse/material-balance', title: '物料平衡', icon: Goods },
      { path: '/deviation-reports', title: '偏差报告', icon: WarnTriangleFilled },
      { path: '/deviation-analytics', title: '偏差分析', icon: DataAnalysis },
    ],
  },
  {
    title: '设备管理',
    icon: SetUp,
    children: [
      { path: '/equipment', title: '设备台账', icon: SetUp },
      { path: '/equipment/plans', title: '维护计划', icon: SetUp },
      { path: '/equipment/records', title: '维保记录', icon: SetUp },
      { path: '/equipment/faults', title: '设备报修', icon: WarnTriangleFilled },
      { path: '/equipment/stats', title: '设备统计', icon: DataAnalysis },
    ],
  },
  {
    title: '仓库管理',
    icon: Goods,
    children: [
      { path: '/warehouse/materials', title: '物料管理', icon: Goods },
      { path: '/warehouse/suppliers', title: '供应商', icon: Goods },
    ],
  },
  {
    title: '培训与内审',
    icon: UserFilled,
    children: [
      { path: '/training/projects', title: '培训项目', icon: UserFilled },
      { path: '/internal-audit/plans', title: '内审计划', icon: Document },
      { path: '/internal-audit/rectifications', title: '整改管理', icon: CircleCheck },
      { path: '/internal-audit/reports', title: '审计报告', icon: Document },
    ],
  },
  {
    title: '数据分析',
    icon: DataAnalysis,
    children: [
      { path: '/statistics/overview', title: '统计概览', icon: DataAnalysis },
      { path: '/statistics/documents', title: '文档统计', icon: DataAnalysis },
      { path: '/statistics/tasks', title: '任务统计', icon: DataAnalysis },
      { path: '/statistics/dashboard', title: '数据大屏', icon: Monitor },
    ],
  },
  {
    title: '来料与追溯',
    icon: Box,
    children: [
      { path: '/incoming-inspections', title: '来料检验', icon: Document },
      { path: '/traceability', title: '追溯查询', icon: Search },
    ],
  },
  {
    title: '质量合规',
    icon: CircleCheck,
    children: [
      { path: '/ccp', title: 'CCP 监控', icon: WarnTriangleFilled },
      { path: '/non-conformances', title: '不合格品处置', icon: WarnTriangleFilled },
      { path: '/corrective-actions', title: '纠正措施（CAPA）', icon: CircleCheck },
      { path: '/customer-complaints', title: '顾客投诉', icon: Message },
      { path: '/supplier-evaluations', title: '供应商评估', icon: Goods },
      { path: '/change-events', title: '变更管理', icon: Connection },
    ],
  },
  {
    title: '过程与人员',
    icon: Monitor,
    children: [
      { path: '/environment-records', title: '环境温湿度', icon: Monitor },
      { path: '/process-records', title: '过程参数', icon: DataAnalysis },
      { path: '/metal-detections', title: '金属探测', icon: SetUp },
      { path: '/cleaning-records', title: '清洁消毒', icon: Grid },
      { path: '/measuring-equipment', title: '测量设备', icon: SetUp },
      { path: '/violation-records', title: '员工违规', icon: WarnTriangleFilled },
      { path: '/medication-records', title: '员工用药', icon: UserFilled },
      { path: '/visitor-records', title: '访客登记', icon: User },
      { path: '/emergency-drills', title: '应急演练', icon: HomeFilled },
      { path: '/waste', title: '废弃物管理', icon: Delete },
    ],
  },
  {
    title: '系统管理',
    icon: Setting,
    children: [
      { path: '/users', title: '用户管理', icon: UserFilled },
      { path: '/roles', title: '角色管理', icon: Key },
      { path: '/permissions', title: '权限管理', icon: Setting },
      { path: '/admin/user-permissions', title: '用户权限授予', icon: Key },
      { path: '/admin/permissions', title: '权限定义', icon: Setting },
      { path: '/notifications', title: '消息中心', icon: Message },
      { path: '/search', title: '高级搜索', icon: Search },
      { path: '/recycle-bin', title: '回收站', icon: Delete },
      { path: '/backup/manage', title: '备份管理', icon: Cloudy },
      { path: '/admin/import', title: '批量导入', icon: DataAnalysis },
      { path: '/admin/export', title: '批量导出', icon: DataAnalysis },
      { path: '/monitoring/dashboard', title: '监控大屏', icon: Monitor },
      { path: '/audit/search', title: '审计日志', icon: Odometer },
    ],
  },
];

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile': router.push('/profile'); break;
    case 'password': router.push('/password'); break;
    case 'logout': userStore.logout(); router.push('/login'); break;
  }
};

onMounted(async () => {
  if (userStore.token && !userStore.user) {
    await userStore.fetchUser();
  }
  fetchUnreadCount();
});

const fetchUnreadCount = async () => {
  try {
    const res = await request.get<{ unreadCount: number }>('/notifications');
    unreadCount.value = res.unreadCount || 0;
  } catch {
    unreadCount.value = 0;
  }
};

// 监听路由变化时刷新未读计数
router.afterEach(() => {
  if (userStore.token) {
    fetchUnreadCount();
  }
});
</script>

<style scoped>
.layout-container {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --accent-light: #d4af37;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  --bg: #f5f6fa;
  --white: #ffffff;
  --aside-bg: #ffffff;
  --aside-border: #e8eaed;
  --menu-text: #4a5568;
  --menu-text-hover: #1a1a2e;
  --menu-hover: rgba(201, 162, 39, 0.07);
  --menu-active: rgba(201, 162, 39, 0.12);
  --menu-active-bar: #c9a227;
}

.layout-container { height: 100vh; font-family: -apple-system, sans-serif; }

.aside {
  background: var(--aside-bg);
  border-right: 1px solid var(--aside-border);
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-bottom: 1px solid var(--aside-border);
  padding: 0 16px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(201, 162, 39, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

.logo-text {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a2e;
  letter-spacing: 1px;
  white-space: nowrap;
}

.aside-menu {
  flex: 1;
  border-right: none;
  background: transparent;
  padding: 12px 8px;
}

.aside-menu:not(.el-menu--collapse) { width: 100%; }

.aside-menu :deep(.el-menu-item) {
  height: 40px;
  line-height: 40px;
  margin-bottom: 2px;
  border-radius: 6px;
  color: var(--menu-text);
  transition: all 0.2s ease;
  position: relative;
}

.aside-menu :deep(.el-menu-item:hover) {
  background: var(--menu-hover);
  color: var(--menu-text-hover);
}

.aside-menu :deep(.el-menu-item.is-active) {
  background: var(--menu-active);
  color: var(--accent);
}

.aside-menu :deep(.el-menu-item.is-active)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--menu-active-bar);
}

.aside-menu :deep(.el-menu-item .el-icon) {
  margin-right: 8px;
  font-size: 16px;
}

.aside-menu :deep(.el-sub-menu__title) {
  height: 40px;
  line-height: 40px;
  color: var(--menu-text);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.aside-menu :deep(.el-sub-menu__title:hover) {
  background: var(--menu-hover);
  color: var(--menu-text-hover);
}

.aside-menu :deep(.el-sub-menu__title .el-icon) {
  font-size: 16px;
}

.aside-menu :deep(.el-sub-menu .el-menu) {
  background: transparent;
}

.aside-footer {
  padding: 16px;
  border-top: 1px solid var(--aside-border);
}

.version {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--white);
  border-bottom: 1px solid #e8e8e8;
  padding: 0 24px;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-light);
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background: var(--bg);
  color: var(--primary);
}

.breadcrumb :deep(.el-breadcrumb__inner) {
  color: var(--text-light);
  font-size: 14px;
}

.breadcrumb :deep(.el-breadcrumb__inner.is-link:hover) {
  color: var(--primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-light);
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--bg);
  color: var(--primary);
}

.notification-badge :deep(.el-badge__content) {
  background: var(--accent);
}

.user-dropdown { cursor: pointer; }

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.user-info:hover { background: var(--bg); }

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--white);
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 12px;
  color: var(--text-light);
}

.user-dropdown-menu {
  --el-dropdown-menuItem-hover-fill: var(--menu-hover);
  --el-dropdown-menuItem-hover-color: var(--primary);
  min-width: 160px;
  padding: 8px;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: none;
}

.user-dropdown-menu :deep(.el-dropdown-menu__item) {
  height: 40px;
  line-height: 40px;
  border-radius: 6px;
  font-size: 13px;
}

.user-dropdown-menu :deep(.el-dropdown-menu__item .el-icon) {
  margin-right: 8px;
  font-size: 16px;
}

.logout-item { color: #e74c3c; }

.main {
  background: var(--bg);
  padding: 24px;
  overflow-y: auto;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
