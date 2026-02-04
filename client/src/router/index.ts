import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: 'documents/level1',
        name: 'Level1Documents',
        component: () => import('@/views/documents/Level1List.vue'),
      },
      {
        path: 'documents/level2',
        name: 'Level2Documents',
        component: () => import('@/views/documents/Level1List.vue'),
      },
      {
        path: 'documents/level3',
        name: 'Level3Documents',
        component: () => import('@/views/documents/Level1List.vue'),
      },
      {
        path: 'documents/upload/:level',
        name: 'DocumentUpload',
        component: () => import('@/views/documents/DocumentUpload.vue'),
      },
      {
        path: 'documents/:id',
        name: 'DocumentDetail',
        component: () => import('@/views/documents/DocumentDetail.vue'),
      },
      {
        path: 'documents/:id/edit',
        name: 'DocumentEdit',
        component: () => import('@/views/documents/DocumentUpload.vue'),
      },
      {
        path: 'templates',
        name: 'Templates',
        component: () => import('@/views/templates/TemplateList.vue'),
      },
      {
        path: 'templates/create',
        name: 'TemplateCreate',
        component: () => import('@/views/templates/TemplateEdit.vue'),
      },
      {
        path: 'templates/:id/edit',
        name: 'TemplateEdit',
        component: () => import('@/views/templates/TemplateEdit.vue'),
      },
      {
        path: 'tasks',
        name: 'Tasks',
        component: () => import('@/views/tasks/TaskList.vue'),
      },
      {
        path: 'tasks/create',
        name: 'CreateTask',
        component: () => import('@/views/tasks/TaskCreate.vue'),
      },
      {
        path: 'tasks/:id',
        name: 'TaskDetail',
        component: () => import('@/views/tasks/TaskDetail.vue'),
      },
      {
        path: 'approvals',
        name: 'Approvals',
        component: () => import('@/views/approvals/ApprovalList.vue'),
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/NotificationList.vue'),
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/UserList.vue'),
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
