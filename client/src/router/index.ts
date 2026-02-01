import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      // 文档管理
      {
        path: 'documents/level1',
        name: 'Level1Documents',
        component: () => import('@/views/documents/Level1List.vue'),
        meta: { title: '一级文件', roles: ['admin', 'leader'] },
      },
      {
        path: 'documents/level2',
        name: 'Level2Documents',
        component: () => import('@/views/documents/Level2List.vue'),
        meta: { title: '二级文件', roles: ['admin', 'leader'] },
      },
      {
        path: 'documents/level3',
        name: 'Level3Documents',
        component: () => import('@/views/documents/Level3List.vue'),
        meta: { title: '三级文件', roles: ['admin', 'leader'] },
      },
      // 模板管理
      {
        path: 'templates',
        name: 'Templates',
        component: () => import('@/views/templates/TemplateList.vue'),
        meta: { title: '模板管理', roles: ['admin'] },
      },
      // 任务管理
      {
        path: 'tasks',
        name: 'Tasks',
        component: () => import('@/views/tasks/TaskList.vue'),
        meta: { title: '任务列表' },
      },
      {
        path: 'tasks/create',
        name: 'CreateTask',
        component: () => import('@/views/tasks/TaskCreate.vue'),
        meta: { title: '创建任务', roles: ['admin'] },
      },
      {
        path: 'tasks/:id',
        name: 'TaskDetail',
        component: () => import('@/views/tasks/TaskDetail.vue'),
        meta: { title: '任务详情' },
      },
      // 审批管理
      {
        path: 'approvals',
        name: 'Approvals',
        component: () => import('@/views/approvals/ApprovalList.vue'),
        meta: { title: '待我审批', roles: ['admin', 'leader'] },
      },
      // 消息中心
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/NotificationList.vue'),
        meta: { title: '消息中心' },
      },
      // 用户管理
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/UserList.vue'),
        meta: { title: '用户管理', roles: ['admin'] },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  document.title = (to.meta.title as string) || '文档管理系统';

  const userStore = useUserStore();
  const isPublic = to.meta.public as boolean;
  const requiredRoles = to.meta.roles as string[] | undefined;

  // 公开路由直接放行
  if (isPublic) {
    if (to.path === '/login' && userStore.token) {
      next('/dashboard');
    } else {
      next();
    }
    return;
  }

  // 需要认证的路由
  if (!userStore.token) {
    next('/login');
    return;
  }

  // 角色权限检查
  if (requiredRoles && requiredRoles.length > 0) {
    const hasPermission = requiredRoles.includes(userStore.user?.role || '');
    if (!hasPermission) {
      next('/dashboard');
      return;
    }
  }

  next();
});

export default router;
