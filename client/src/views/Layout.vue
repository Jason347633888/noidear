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
            <template #title>
              <el-badge
                v-if="item.badge && todoStore.pendingTodoCount > 0"
                :value="todoStore.pendingTodoCount"
                :max="99"
              >{{ item.title }}</el-badge>
              <span v-else>{{ item.title }}</span>
            </template>
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
import { useTodoStore } from '@/stores/todo';
import {
  Document, Fold, Expand, Bell, ArrowDown,
  User, Lock, SwitchButton, HomeFilled, Files,
  Grid, List, CircleCheck, Message, UserFilled,
  DataAnalysis, Setting, Connection, Box, Goods, Key,
  SetUp, WarnTriangleFilled, Monitor, Cloudy, Search, Odometer, Delete, RefreshLeft,
} from '@element-plus/icons-vue';

import request from '@/api/request';
import { menuGroups } from '@/navigation/menu';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const todoStore = useTodoStore();
const isCollapsed = ref(false);
const unreadCount = ref(0);

const activeMenu = computed(() => route.path);
const currentTitle = computed(() => route.meta.title as string || '');

const menuItems = menuGroups;

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
  todoStore.refreshPendingCount();
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
  height: 100vh;
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
  overflow-y: auto;
  min-height: 0;
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
  min-height: 0; /* flexbox 内滚动必须 */
}

/* 内层纵向容器需要高度约束才能让 el-main 滚动 */
.layout-container > :deep(.el-container) {
  height: 100vh;
  overflow: hidden;
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
