import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/login/sso',
    name: 'SsoLogin',
    component: () => import('@/views/login/SsoLogin.vue'),
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
        path: 'documents',
        name: 'Documents',
        component: () => import('@/views/documents/Level1List.vue'),
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
        path: 'templates/:id/tolerance',
        name: 'ToleranceConfig',
        component: () => import('@/views/templates/ToleranceConfig.vue'),
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
        name: 'Approvals',
        component: () => import('@/views/approvals/ApprovalList.vue'),
      },
      {
        path: 'approvals/pending',
        name: 'ApprovalPending',
        component: () => import('@/views/approvals/ApprovalPending.vue'),
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
      {
        path: 'statistics/overview',
        name: 'StatisticsOverview',
        component: () => import('@/views/statistics/Overview.vue'),
      },
      {
        path: 'statistics/documents',
        name: 'DocumentStatistics',
        component: () => import('@/views/statistics/DocumentStatistics.vue'),
      },
      {
        path: 'statistics/tasks',
        name: 'TaskStatistics',
        component: () => import('@/views/statistics/TaskStatistics.vue'),
      },
      {
        path: 'recycle-bin',
        name: 'RecycleBin',
        component: () => import('@/views/RecycleBin.vue'),
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
      // 表单设计器（旧路径兼容）
      {
        path: 'templates/designer',
        name: 'TemplateDesigner',
        component: () => import('@/views/templates/TemplateDesigner.vue'),
      },
      // RecordTemplate 拖拽式设计器（REQUIREMENTS P2）
      {
        path: 'record-templates/:id/designer',
        name: 'RecordTemplateDesigner',
        component: () => import('@/views/templates/TemplateDesigner.vue'),
        meta: { title: '表单设计器' },
      },
      // 工作流模块
      {
        path: 'workflow/templates',
        name: 'WorkflowTemplates',
        component: () => import('@/views/workflow/TemplateList.vue'),
      },
      {
        path: 'workflow/templates/create',
        name: 'WorkflowTemplateCreate',
        component: () => import('@/views/workflow/TemplateEditor.vue'),
      },
      {
        path: 'workflow/templates/:id/edit',
        name: 'WorkflowTemplateEdit',
        component: () => import('@/views/workflow/TemplateEditor.vue'),
      },
      {
        path: 'workflow/my-tasks',
        name: 'WorkflowMyTasks',
        component: () => import('@/views/workflow/MyTasks.vue'),
      },
      {
        path: 'workflow/instances',
        name: 'WorkflowInstances',
        component: () => import('@/views/workflow/InstanceList.vue'),
      },
      {
        path: 'workflow/instances/:id',
        name: 'WorkflowInstanceDetail',
        component: () => import('@/views/workflow/InstanceDetail.vue'),
      },
      {
        path: 'workflow/statistics',
        name: 'WorkflowStatistics',
        component: () => import('@/views/workflow/WorkflowStatistics.vue'),
      },
      // 记录模块
      {
        path: 'records',
        name: 'Records',
        component: () => import('@/views/record/RecordList.vue'),
      },
      {
        path: 'records/:id',
        name: 'RecordDetail',
        component: () => import('@/views/record/RecordDetail.vue'),
      },
      {
        path: 'records/fill/:templateId',
        name: 'RecordFill',
        component: () => import('@/views/records/RecordFill.vue'),
        meta: { title: '填写记录' },
      },
      {
        path: 'records/task/:instanceId',
        name: 'RecordTaskFill',
        component: () => import('@/views/records/RecordFill.vue'),
        meta: { title: '填写任务' },
      },
      {
        path: 'record-tasks/my',
        name: 'RecordTaskInstanceList',
        component: () => import('@/views/record-tasks/RecordTaskInstanceList.vue'),
        meta: { title: '待填任务' },
      },
      {
        path: 'record-tasks/manage',
        name: 'RecordTaskAssignmentList',
        component: () => import('@/views/record-tasks/RecordTaskAssignmentList.vue'),
        meta: { title: '任务配置' },
      },
      // 批次追溯模块
      {
        path: 'batch-trace',
        name: 'BatchTrace',
        component: () => import('@/views/batch-trace/BatchList.vue'),
      },
      {
        path: 'batch-trace/query',
        name: 'TraceQuery',
        component: () => import('@/views/batch-trace/TraceQuery.vue'),
        meta: { title: '批次追溯查询' },
      },
      {
        path: 'batch-trace/report',
        name: 'TraceReport',
        component: () => import('@/views/batch-trace/TraceReport.vue'),
        meta: { title: '追溯报告' },
      },
      {
        path: 'batch-trace/:id',
        name: 'BatchDetail',
        component: () => import('@/views/batch-trace/BatchDetail.vue'),
      },
      // TraceVisualization removed: duplicate of TraceQuery, use /batch-trace/query instead
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
        redirect: '/production/workshop-staging',
      },
      {
        path: 'warehouse/material-balance',
        name: 'MaterialBalance',
        component: () => import('@/views/warehouse/MaterialBalance.vue'),
      },
      {
        path: 'warehouse/traceability',
        name: 'Traceability',
        component: () => import('@/views/warehouse/Traceability.vue'),
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
      // 内审管理模块
      {
        path: 'internal-audit/plans',
        name: 'InternalAuditPlans',
        component: () => import('@/views/internal-audit/PlanList.vue'),
        meta: { title: '内审计划' },
      },
      {
        path: 'internal-audit/plans/:id/execute',
        name: 'AuditExecute',
        component: () => import('@/views/internal-audit/AuditExecute.vue'),
        meta: { title: '审核执行' },
      },
      {
        path: 'internal-audit/rectifications',
        name: 'InternalAuditRectifications',
        component: () => import('@/views/internal-audit/RectificationList.vue'),
        meta: { title: '我的整改任务' },
      },
      {
        path: 'internal-audit/verifications',
        name: 'InternalAuditVerifications',
        component: () => import('@/views/internal-audit/VerificationList.vue'),
        meta: { title: '复审验证' },
      },
      {
        path: 'internal-audit/reports',
        name: 'InternalAuditReports',
        component: () => import('@/views/internal-audit/ReportList.vue'),
        meta: { title: '内审报告' },
      },
      {
        path: 'internal-audit/reports/:id',
        name: 'InternalAuditReportDetail',
        component: () => import('@/views/internal-audit/ReportDetail.vue'),
        meta: { title: '内审报告详情' },
      },
      // 系统运维监控模块
      {
        path: 'monitoring/dashboard',
        name: 'MonitoringDashboard',
        component: () => import('@/views/monitoring/Dashboard.vue'),
      },
      {
        path: 'monitoring/metrics',
        name: 'MetricsPage',
        component: () => import('@/views/monitoring/MetricsPage.vue'),
      },
      {
        path: 'monitoring/alerts/rules',
        name: 'AlertRuleList',
        component: () => import('@/views/monitoring/AlertRuleList.vue'),
      },
      {
        path: 'monitoring/alerts/history',
        name: 'AlertHistoryList',
        component: () => import('@/views/monitoring/AlertHistoryList.vue'),
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
      {
        path: 'backup/manage',
        name: 'BackupManage',
        component: () => import('@/views/backup/BackupManage.vue'),
      },
      {
        path: 'health',
        name: 'HealthPage',
        component: () => import('@/views/health/HealthPage.vue'),
      },
      // 高级功能模块
      {
        path: 'search',
        name: 'AdvancedSearch',
        component: () => import('@/views/search/AdvancedSearch.vue'),
      },
      {
        path: 'admin/export',
        name: 'ExportPage',
        component: () => import('@/views/admin/ExportPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/import',
        name: 'ImportPage',
        component: () => import('@/views/admin/ImportPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'workflow/designer',
        name: 'WorkflowDesignerLegacy',
        redirect: '/workflow-templates/designer',
      },
      {
        path: 'workflow-templates/designer',
        name: 'WorkflowDesigner',
        component: () => import('@/views/workflow/WorkflowDesigner.vue'),
      },
      {
        path: 'statistics/dashboard',
        name: 'StatisticsDashboard',
        component: () => import('@/views/statistics/StatisticsDashboard.vue'),
        meta: { requiresAdmin: true },
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
      // 顾客投诉模块
      {
        path: 'customer-complaints',
        name: 'CustomerComplaintList',
        component: () => import('@/views/customer-complaint/CustomerComplaintList.vue'),
        meta: { title: '顾客投诉管理' },
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
      // 配方管理模块
      {
        path: 'recipes',
        name: 'RecipeList',
        component: () => import('@/views/recipe/RecipeList.vue'),
        meta: { title: '配方管理' },
      },
      // 工序步骤/CCP管理模块
      {
        path: 'process-steps',
        name: 'ProcessStepList',
        component: () => import('@/views/process-step/ProcessStepList.vue'),
        meta: { title: '工序步骤管理' },
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
      // 资产借用记录模块
      {
        path: 'asset-loan-records',
        name: 'AssetLoanRecordList',
        component: () => import('@/views/asset-loan-record/AssetLoanRecordList.vue'),
        meta: { title: '资产借用记录' },
      },
      // 表单领用记录模块
      {
        path: 'document-issuances',
        name: 'DocumentIssuanceList',
        component: () => import('@/views/document-issuance/DocumentIssuanceList.vue'),
        meta: { title: '表单领用记录' },
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
router.beforeEach((to, from, next) => {
  const publicPaths = ['/login', '/login/sso'];
  const token = localStorage.getItem('token');

  if (!publicPaths.includes(to.path) && !token) {
    next('/login');
    return;
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
