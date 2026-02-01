<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapsed ? '64px' : '220px'" class="aside">
      <div class="logo">
        <el-icon v-if="isCollapsed"><Document /></el-icon>
        <span v-else>文档管理系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        router
        class="aside-menu"
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-menu-item :index="item.path" v-if="showMenuItem(item)">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapsed = !isCollapsed">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
            <el-icon :size="20" @click="$router.push('/notifications')">
              <Bell />
            </el-icon>
          </el-badge>
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" :src="userStore.user?.avatar">
                {{ userStore.user?.name?.charAt(0) }}
              </el-avatar>
              <span class="user-name">{{ userStore.user?.name }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Lock /></el-icon>修改密码
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
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
  Document,
  Fold,
  Expand,
  Bell,
  ArrowDown,
  User,
  Lock,
  SwitchButton,
  HomeFilled,
  Files,
  Grid,
  List,
  CircleCheck,
  Message,
  UserFilled,
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const isCollapsed = ref(false);
const unreadCount = ref(0);

const activeMenu = computed(() => route.path);
const currentTitle = computed(() => route.meta.title as string || '');

interface MenuItem {
  path: string;
  title: string;
  icon: string;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', title: '首页', icon: 'HomeFilled' },
  { path: '/documents/level1', title: '一级文件', icon: 'Files', roles: ['admin', 'leader'] },
  { path: '/documents/level2', title: '二级文件', icon: 'Files', roles: ['admin', 'leader'] },
  { path: '/documents/level3', title: '三级文件', icon: 'Files', roles: ['admin', 'leader'] },
  { path: '/templates', title: '模板管理', icon: 'Grid', roles: ['admin'] },
  { path: '/tasks', title: '任务列表', icon: 'List' },
  { path: '/approvals', title: '待我审批', icon: 'CircleCheck', roles: ['admin', 'leader'] },
  { path: '/notifications', title: '消息中心', icon: 'Message' },
  { path: '/users', title: '用户管理', icon: 'UserFilled', roles: ['admin'] },
];

const showMenuItem = (item: MenuItem) => {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(userStore.user?.role || '');
};

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile');
      break;
    case 'password':
      router.push('/password');
      break;
    case 'logout':
      userStore.logout();
      router.push('/login');
      break;
  }
};

onMounted(() => {
  // 模拟未读消息数，实际应从 API 获取
  unreadCount.value = 3;
});
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background: #304156;
  transition: width 0.3s;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.aside-menu {
  border-right: none;
  background: transparent;
}

.aside-menu:not(.el-menu--collapse) {
  width: 220px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.notification-badge {
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main {
  background: #f5f7fa;
  padding: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
