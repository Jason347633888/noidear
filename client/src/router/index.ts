import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';

const redirectToProductWorkbench = () => {
  ElMessage.info('配方和工序已合并到产品详情/产品工作台，请在产品目录中进入对应产品维护。');
  return '/products';
};

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
        meta: { title: '工作台' },
      },
      {
        path: 'documents',
        name: 'Documents',
        component: () => import('@/views/documents/SystemDocumentCenter.vue'),
        meta: { title: '文档管理' },
      },
      { path: 'documents/level1', redirect: '/documents' },
      { path: 'documents/level2', redirect: '/documents' },
      { path: 'documents/level3', redirect: '/documents' },
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
      // 文控中心
      {
        path: 'documents/control/library',
        redirect: '/documents',
      },
      {
        path: 'deviation-reports',
        name: 'DeviationReports',
        component: () => import('@/views/deviation/DeviationReportView.vue'),
      },
      {
        path: 'deviation-analytics',
        name: 'DeviationAnalytics',
        component: () => import('@/views/deviation/DeviationAnalytics.vue'),
      },
      {
        path: 'approvals',
        redirect: '/approvals/pending',
      },
      {
        path: 'approvals/pending',
        name: 'ApprovalPending',
        component: () => import('@/views/approvals/ApprovalPending.vue'),
        meta: { title: '待我审批' },
      },
      {
        path: 'approvals/detail/:id',
        name: 'ApprovalDetail',
        component: () => import('@/views/approvals/ApprovalDetail.vue'),
      },
      {
        path: 'approvals/history',
        name: 'ApprovalHistory',
        component: () => import('@/views/approvals/ApprovalHistory.vue'),
      },
      {
        path: 'i18n',
        name: 'I18nManager',
        component: () => import('@/views/i18n/I18nManager.vue'),
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
      {
        path: 'departments',
        name: 'Departments',
        component: () => import('@/views/DepartmentList.vue'),
        meta: { title: '部门管理' },
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('@/views/role/RoleList.vue'),
      },
      {
        path: 'permissions',
        name: 'Permissions',
        component: () => import('@/views/permission/PermissionList.vue'),
      },
      // P1-2 细粒度权限配置
      {
        path: 'permissions/fine-grained',
        name: 'FineGrainedPermission',
        component: () => import('@/views/permission/FineGrainedPermission.vue'),
      },
      {
        path: 'permissions/department',
        name: 'DepartmentPermission',
        component: () => import('@/views/permission/DepartmentPermission.vue'),
      },
      {
        path: 'permissions/audit-log',
        name: 'PermissionAuditLog',
        component: () => import('@/views/permission/PermissionAuditLog.vue'),
      },
      {
        path: 'password',
        name: 'Password',
        component: () => import('@/views/Password.vue'),
      },
      // 用户权限管理
      {
        path: 'users/:id/permissions',
        name: 'UserPermissions',
        component: () => import('@/views/permission/UserPermissions.vue'),
      },
      // 用户权限管理总览（P1-2 细粒度权限）
      {
        path: 'admin/user-permissions',
        name: 'UserPermissionsManager',
        component: () => import('@/views/permission/UserPermissionsManager.vue'),
        meta: { title: '用户权限管理', requiresAdmin: true },
      },
      // 权限定义列表（P1-2 细粒度权限）
      {
        path: 'admin/permissions',
        name: 'PermissionDefinitions',
        component: () => import('@/views/permission/PermissionDefinitions.vue'),
        meta: { title: '权限定义', requiresAdmin: true },
      },
      {
        path: 'my-todos',
        name: 'MyTodos',
        component: () => import('@/views/my-todos/MyTodos.vue'),
        meta: { title: '我的待办' },
      },
      // 批次追溯模块
      {
        path: 'batch-trace',
        name: 'BatchTrace',
        component: () => import('@/views/batch-trace/BatchList.vue'),
      },
      {
        path: 'batch-trace/query',
        name: 'TraceabilityLegacyRedirect',
        redirect: '/traceability',
        meta: { title: '批次追溯查询（已弃用）' },
      },
      {
        path: 'batch-trace/report',
        name: 'TraceReportLegacyRedirect',
        redirect: '/traceability',
        meta: { title: '追溯报告（已弃用）' },
      },
      {
        path: 'batch-trace/:id',
        name: 'BatchDetail',
        component: () => import('@/views/batch-trace/BatchDetail.vue'),
      },
      // TraceVisualization removed: use /traceability instead
      {
        path: 'production/workshop-staging',
        name: 'WorkshopStaging',
        component: () => import('@/views/production/WorkshopStaging.vue'),
      },
      // 仓库管理模块
      {
        path: 'warehouse/materials',
        name: 'Materials',
        component: () => import('@/views/warehouse/MaterialList.vue'),
      },
      {
        path: 'warehouse/batches',
        name: 'WarehouseBatches',
        component: () => import('@/views/warehouse/BatchManagement.vue'),
      },
      {
        path: 'warehouse/requisitions',
        name: 'Requisitions',
        component: () => import('@/views/warehouse/RequisitionList.vue'),
      },
      {
        path: 'warehouse/suppliers',
        name: 'Suppliers',
        component: () => import('@/views/warehouse/SupplierList.vue'),
      },
      {
        path: 'warehouse/staging-area',
        name: 'StagingArea',
        component: () => import('@/views/warehouse/StagingArea.vue'),
        meta: { title: '配料区库存与盘点' },
      },
      {
        path: 'mixing/workbench',
        name: 'MixingWorkbench',
        component: () => import('@/views/mixing/MixingWorkbench.vue'),
        meta: { title: '配料执行' },
      },
      {
        path: 'warehouse/material-balance',
        name: 'MaterialBalance',
        component: () => import('@/views/warehouse/MaterialBalance.vue'),
      },
      {
        path: 'warehouse/traceability',
        name: 'WarehouseTraceabilityLegacyRedirect',
        redirect: '/traceability',
        meta: { title: '仓库追溯（已弃用）' },
      },
      // 追溯查询模块（Task 19）
      {
        path: 'traceability',
        name: 'TraceabilityQuery',
        component: () => import('@/views/traceability/TraceabilityQuery.vue'),
        meta: { title: '追溯查询', requiresAuth: true },
      },
      // 设备管理模块
      {
        path: 'equipment',
        name: 'EquipmentList',
        component: () => import('@/views/equipment/EquipmentList.vue'),
      },
      {
        path: 'equipment/stats',
        name: 'EquipmentStats',
        component: () => import('@/views/equipment/EquipmentStats.vue'),
      },
      {
        path: 'equipment/:id',
        name: 'EquipmentDetail',
        component: () => import('@/views/equipment/EquipmentDetail.vue'),
      },
      {
        path: 'equipment/plans',
        name: 'PlanList',
        component: () => import('@/views/equipment/PlanList.vue'),
      },
      {
        path: 'equipment/plans/calendar',
        name: 'PlanCalendar',
        component: () => import('@/views/equipment/PlanCalendar.vue'),
      },
      {
        path: 'equipment/records',
        name: 'MaintenanceRecordList',
        component: () => import('@/views/equipment/RecordList.vue'),
      },
      {
        path: 'equipment/records/create',
        name: 'MaintenanceRecordCreate',
        component: () => import('@/views/equipment/RecordForm.vue'),
      },
      {
        path: 'equipment/records/:id',
        name: 'MaintenanceRecordDetail',
        component: () => import('@/views/equipment/RecordDetail.vue'),
      },
      {
        path: 'equipment/faults',
        name: 'FaultList',
        component: () => import('@/views/equipment/FaultList.vue'),
      },
      {
        path: 'equipment/faults/create',
        name: 'FaultCreate',
        component: () => import('@/views/equipment/FaultCreate.vue'),
      },
      {
        path: 'equipment/faults/stats',
        name: 'FaultStats',
        component: () => import('@/views/equipment/FaultStats.vue'),
      },
      {
        path: 'equipment/faults/:id',
        name: 'FaultDetail',
        component: () => import('@/views/equipment/FaultDetail.vue'),
      },
      // 培训管理模块
      {
        path: 'training/plans',
        name: 'TrainingPlans',
        component: () => import('@/views/training/plans/PlanList.vue'),
      },
      {
        path: 'training/plans/:id',
        name: 'TrainingPlanDetail',
        component: () => import('@/views/training/plans/PlanDetail.vue'),
      },
      {
        path: 'training/projects',
        name: 'TrainingProjects',
        component: () => import('@/views/training/projects/ProjectList.vue'),
      },
      {
        path: 'training/projects/create',
        name: 'TrainingProjectCreate',
        component: () => import('@/views/training/projects/ProjectForm.vue'),
      },
      {
        path: 'training/projects/:id',
        name: 'TrainingProjectDetail',
        component: () => import('@/views/training/projects/ProjectDetail.vue'),
      },
      {
        path: 'training/projects/:id/edit',
        name: 'TrainingProjectEdit',
        component: () => import('@/views/training/projects/ProjectForm.vue'),
      },
      {
        path: 'training/projects/:id/questions',
        name: 'TrainingQuestions',
        component: () => import('@/views/training/questions/QuestionManage.vue'),
      },
      {
        path: 'training/exam/:projectId',
        name: 'TrainingExam',
        component: () => import('@/views/training/exam/ExamPage.vue'),
      },
      {
        path: 'training/statistics',
        name: 'TrainingStatistics',
        component: () => import('@/views/training/statistics/StatisticsPage.vue'),
      },
      {
        path: 'training/archives',
        name: 'TrainingArchives',
        component: () => import('@/views/training/archives/ArchiveList.vue'),
      },
      {
        path: 'training/archives/:id',
        name: 'TrainingArchiveDetail',
        component: () => import('@/views/training/archives/ArchiveDetail.vue'),
      },
      {
        path: 'audit/login-logs',
        name: 'LoginLogList',
        component: () => import('@/views/audit/LoginLogList.vue'),
      },
      {
        path: 'audit/permission-logs',
        name: 'PermissionLogList',
        component: () => import('@/views/audit/PermissionLogList.vue'),
      },
      {
        path: 'audit/sensitive-logs',
        name: 'SensitiveLogList',
        component: () => import('@/views/audit/SensitiveLogList.vue'),
      },
      {
        path: 'audit/search',
        name: 'AuditSearch',
        component: () => import('@/views/audit/AuditSearchPage.vue'),
      },
      // 高级功能模块
      {
        path: 'search',
        name: 'AdvancedSearch',
        component: () => import('@/views/search/AdvancedSearch.vue'),
      },
      // CCP 监控模块
      {
        path: 'ccp/records',
        name: 'CcpRecordList',
        component: () => import('@/views/ccp/CcpRecordList.vue'),
        meta: { title: 'CCP 监控记录' },
      },
      // 不合格品管理模块
      {
        path: 'non-conformances',
        name: 'NonConformanceList',
        component: () => import('@/views/non-conformance/NonConformanceList.vue'),
        meta: { title: '不合格品管理' },
      },
      // 纠正措施模块
      {
        path: 'corrective-actions',
        name: 'CorrectiveActionList',
        component: () => import('@/views/corrective-action/CorrectiveActionList.vue'),
        meta: { title: '纠正措施' },
      },
      {
        path: 'corrective-actions/:id',
        name: 'CapaDetail',
        component: () => import('@/views/corrective-action/CapaDetail.vue'),
        meta: { title: 'CAPA 详情' },
      },
      // 顾客投诉模块
      {
        path: 'customer-complaints',
        name: 'CustomerComplaintList',
        component: () => import('@/views/customer-complaint/CustomerComplaintList.vue'),
        meta: { title: '顾客投诉管理' },
      },
      // 产品召回模块
      {
        path: 'product-recalls',
        name: 'ProductRecallList',
        component: () => import('@/views/product-recall/ProductRecallList.vue'),
        meta: { title: '产品召回' },
      },
      {
        path: 'product-recalls/:id',
        name: 'ProductRecallDetail',
        component: () => import('@/views/product-recall/ProductRecallDetail.vue'),
        meta: { title: '召回详情' },
      },
      // 环境温湿度记录模块
      {
        path: 'environment-records',
        name: 'EnvironmentRecordList',
        component: () => import('@/views/environment-record/EnvironmentRecordList.vue'),
        meta: { title: '环境温湿度记录' },
      },
      // 过程参数监控模块
      {
        path: 'process-records',
        name: 'ProcessRecordList',
        component: () => import('@/views/process-record/ProcessRecordList.vue'),
        meta: { title: '过程参数监控' },
      },
      // 金属探测记录模块
      {
        path: 'metal-detections',
        name: 'MetalDetectionList',
        component: () => import('@/views/metal-detection/MetalDetectionList.vue'),
        meta: { title: '金属探测记录' },
      },
      // 清洁消毒记录模块
      {
        path: 'cleaning-records',
        name: 'CleaningRecordList',
        component: () => import('@/views/cleaning-record/CleaningRecordList.vue'),
        meta: { title: '清洁消毒记录' },
      },
      // 员工违规记录模块
      {
        path: 'violation-records',
        name: 'ViolationRecordList',
        component: () => import('@/views/violation-record/ViolationRecordList.vue'),
        meta: { title: '员工违规记录' },
      },
      // 员工用药记录模块
      {
        path: 'medication-records',
        name: 'MedicationRecordList',
        component: () => import('@/views/medication-record/MedicationRecordList.vue'),
        meta: { title: '员工用药记录' },
      },
      // 测量设备 + 校准记录模块
      {
        path: 'measuring-equipment',
        name: 'MeasuringEquipmentList',
        component: () => import('@/views/measuring-equipment/EquipmentList.vue'),
        meta: { title: '测量设备管理' },
      },
      // 供应商评估模块
      {
        path: 'supplier-evaluations',
        name: 'SupplierEvaluationList',
        component: () => import('@/views/supplier-evaluation/EvaluationList.vue'),
        meta: { title: '供应商评估' },
      },
      // 变更管理模块
      {
        path: 'change-events',
        name: 'ChangeEventList',
        component: () => import('@/views/change-event/ChangeEventList.vue'),
        meta: { title: '变更管理' },
      },
      // 废弃物管理模块
      {
        path: 'waste',
        name: 'WasteManagement',
        component: () => import('@/views/waste/WasteManagement.vue'),
        meta: { title: '废弃物管理' },
      },
      // 产品研发流程模块
      {
        path: 'process',
        name: 'ProcessList',
        component: () => import('@/views/process/ProcessList.vue'),
        meta: { title: '产品研发流程' },
      },
      {
        path: 'process/instances/:id',
        name: 'ProcessDetail',
        component: () => import('@/views/process/ProcessDetail.vue'),
        meta: { title: '研发流程详情' },
      },
      // 访客登记模块
      {
        path: 'visitor-records',
        name: 'VisitorRecordList',
        component: () => import('@/views/visitor-record/VisitorRecordList.vue'),
        meta: { title: '访客登记' },
      },
      // 应急演练模块
      {
        path: 'emergency-drills',
        name: 'EmergencyDrillList',
        component: () => import('@/views/emergency-drill/EmergencyDrillList.vue'),
        meta: { title: '应急演练记录' },
      },
      // 来料检验模块
      {
        path: 'incoming-inspections',
        name: 'IncomingInspectionList',
        component: () => import('@/views/incoming-inspection/IncomingInspectionList.vue'),
        meta: { title: '来料检验' },
      },
      // 产品目录模块
      {
        path: 'products',
        name: 'ProductList',
        component: () => import('@/views/product/ProductList.vue'),
        meta: { title: '产品目录' },
      },
      {
        path: 'products/by-plan/:planId',
        name: 'ProductByPlanRedirect',
        component: () => import('@/views/product/ProductByPlanRedirect.vue'),
        meta: { title: '产品工艺变更跳转', hidden: true },
      },
      {
        path: 'products/:id',
        name: 'ProductDetail',
        component: () => import('@/views/product/ProductDetail.vue'),
        meta: { title: '产品详情' },
      },
      // 配方管理 / 工序步骤管理已合并至产品信息页面，旧路由跳转到产品列表
      {
        path: 'recipes',
        beforeEnter: redirectToProductWorkbench,
        meta: { hidden: true },
      },
      {
        path: 'recipes/:id/edit',
        beforeEnter: redirectToProductWorkbench,
        meta: { hidden: true },
      },
      {
        path: 'process-steps',
        beforeEnter: redirectToProductWorkbench,
        meta: { hidden: true },
      },
      // 回料/返工记录模块
      {
        path: 'rework-records',
        name: 'ReworkRecordList',
        component: () => import('@/views/rework-record/ReworkRecordList.vue'),
        meta: { title: '回料/返工记录' },
      },
      // 玻璃及硬塑完整性检查模块
      {
        path: 'fragile-item-inspections',
        name: 'FragileItemInspectionList',
        component: () => import('@/views/fragile-item-inspection/FragileItemInspectionList.vue'),
        meta: { title: '玻璃及硬塑完整性检查' },
      },
      // 换产前检查模块
      {
        path: 'line-change-check-records',
        name: 'LineChangeCheckRecordList',
        component: () => import('@/views/line-change-check-record/LineChangeCheckRecordList.vue'),
        meta: { title: '换产前检查' },
      },
      // 食品安全文化建设模块
      {
        path: 'food-safety-culture-records',
        name: 'FoodSafetyCultureRecordList',
        component: () => import('@/views/food-safety-culture-record/FoodSafetyCultureRecordList.vue'),
        meta: { title: '食品安全文化建设' },
      },
      // 外部方档案模块
      {
        path: 'external-parties',
        name: 'ExternalPartyList',
        component: () => import('@/views/external-party/ExternalPartyList.vue'),
        meta: { title: '外部方档案' },
      },
      // 包装材料用量记录模块
      {
        path: 'packaging-material-usages',
        name: 'PackagingMaterialUsageList',
        component: () => import('@/views/packaging-material-usage/PackagingMaterialUsageList.vue'),
        meta: { title: '包装材料用量记录' },
      },
      // 班次看板模块
      {
        path: 'shift-dashboard',
        name: 'ShiftDashboard',
        component: () => import('@/views/shift/ShiftDashboard.vue'),
        meta: { title: '班次看板' },
      },
    ],
  },
  // 打印页（无 Layout）
  {
    path: '/process/instances/:id/print',
    name: 'ProcessPrint',
    component: () => import('@/views/process/ProcessPrint.vue'),
    meta: { title: '研发流程打印', hideLayout: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 导航守卫
router.beforeEach(async (to, _from, next) => {
  const publicPaths = ['/login'];
  const token = localStorage.getItem('token');

  if (!publicPaths.includes(to.path) && !token) {
    next('/login');
    return;
  }

  if (token) {
    const userStore = useUserStore();
    if (!userStore.user) {
      await userStore.fetchUser();
    }

  }

  if (to.meta?.requiresAdmin) {
    const userStore = useUserStore();
    if (!userStore.isAdmin) {
      next('/dashboard');
      return;
    }
  }

  next();
});

export default router;
