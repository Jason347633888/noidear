<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapsed ? '72px' : '260px'" class="aside">
      <div class="logo">
        <div class="logo-icon">
          <el-icon :size="24"><Document /></el-icon>
        </div>
        <transition name="fade">
          <span v-if="!isCollapsed" class="logo-text">文档管理</span>
        </transition>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        router
        class="aside-menu"
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-menu-item :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
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
          <LanguageSwitcher />

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
  SetUp, WarnTriangleFilled, Monitor, Histogram, AlarmClock,
  Cloudy, Search, Odometer,
} from '@element-plus/icons-vue';

import request from '@/api/request';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const isCollapsed = ref(false);
const unreadCount = ref(0);

const activeMenu = computed(() => route.path);
const currentTitle = computed(() => route.meta.title as string || '');

const menuItems = [
  { path: '/dashboard', title: '工作台', icon: HomeFilled },
  { path: '/documents/level1', title: '一级文件', icon: Files },
  { path: '/documents/level2', title: '二级文件', icon: Files },
  { path: '/documents/level3', title: '三级文件', icon: Files },
  { path: '/templates', title: '模板管理', icon: Grid },
  { path: '/tasks', title: '任务列表', icon: List },
  { path: '/records', title: '记录管理', icon: Document },
  { path: '/approvals/pending', title: '待我审批', icon: CircleCheck },
  { path: '/approvals/history', title: '审批历史', icon: CircleCheck },
  { path: '/workflow/templates', title: '工作流模板', icon: Connection },
  { path: '/workflow/my-tasks', title: '工作流待办', icon: Connection },
  { path: '/workflow/instances', title: '工作流实例', icon: Connection },
  { path: '/batch-trace', title: '批次追溯', icon: Box },
  { path: '/warehouse/materials', title: '物料管理', icon: Goods },
  { path: '/warehouse/requisitions', title: '领料管理', icon: Goods },
  { path: '/warehouse/suppliers', title: '供应商', icon: Goods },
  { path: '/warehouse/staging-area', title: '暂存间', icon: Goods },
  { path: '/warehouse/material-balance', title: '物料平衡', icon: Goods },
  { path: '/equipment', title: '设备台账', icon: SetUp },
  { path: '/equipment/plans', title: '维护计划', icon: SetUp },
  { path: '/equipment/records', title: '维保记录', icon: SetUp },
  { path: '/equipment/faults', title: '设备报修', icon: WarnTriangleFilled },
  { path: '/equipment/stats', title: '设备统计', icon: DataAnalysis },
  { path: '/statistics/overview', title: '统计概览', icon: DataAnalysis },
  { path: '/statistics/documents', title: '文档统计', icon: DataAnalysis },
  { path: '/statistics/tasks', title: '任务统计', icon: DataAnalysis },
  { path: '/notifications', title: '消息中心', icon: Message },
  { path: '/users', title: '用户管理', icon: UserFilled },
  { path: '/roles', title: '角色管理', icon: Key },
  { path: '/permissions', title: '权限管理', icon: Setting },
  // 系统运维监控
  { path: '/monitoring/dashboard', title: '监控大屏', icon: Monitor },
  { path: '/monitoring/metrics', title: '性能指标', icon: Histogram },
  { path: '/monitoring/alerts/rules', title: '告警规则', icon: AlarmClock },
  { path: '/monitoring/alerts/history', title: '告警历史', icon: AlarmClock },
  // 审计日志
  { path: '/audit/login-logs', title: '登录日志', icon: Odometer },
  { path: '/audit/permission-logs', title: '权限变更日志', icon: Key },
  { path: '/audit/sensitive-logs', title: '敏感操作日志', icon: WarnTriangleFilled },
  { path: '/audit/search', title: '综合日志搜索', icon: Search },
  // 备份与健康
  { path: '/backup/manage', title: '备份管理', icon: Cloudy },
  { path: '/health', title: '健康检查', icon: Monitor },
  // 高级功能
  { path: '/search', title: '高级搜索', icon: Search },
  { path: '/admin/export', title: '批量导出', icon: DataAnalysis },
  { path: '/admin/import', title: '批量导入', icon: DataAnalysis },
  { path: '/workflow/designer', title: '流程设计器', icon: Connection },
  { path: '/statistics/dashboard', title: '数据大屏', icon: Monitor },
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
  --aside-bg: var(--primary);
  --menu-hover: rgba(201, 162, 39, 0.1);
  --menu-active: rgba(201, 162, 39, 0.15);
}

.layout-container { height: 100vh; font-family: -apple-system, sans-serif; }

.aside {
  background: var(--aside-bg);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
  color: var(--white);
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
  height: 44px;
  line-height: 44px;
  margin-bottom: 4px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
}

.aside-menu :deep(.el-menu-item:hover) {
  background: var(--menu-hover);
  color: var(--white);
}

.aside-menu :deep(.el-menu-item.is-active) {
  background: var(--menu-active);
  color: var(--accent);
}

.aside-menu :deep(.el-menu-item .el-icon) {
  margin-right: 8px;
  font-size: 18px;
}

.aside-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.version {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
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
