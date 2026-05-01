# 覆盖矩阵

> 生成日期：2026-05-01  
> 覆盖范围：前端路由、后端模块、Prisma 模型、API 适配器

---

## 1. 前端路由覆盖表

| 路由 | 页面 | 所属模块文档 | 状态 | 备注 |
|---|---|---|---|---|
| /login | Login.vue | 13-system-admin-ops.md | 支撑能力 | 认证入口 |
| /login/sso | SsoLogin.vue | 13-system-admin-ops.md | 支撑能力 | SSO 登录 |
| /dashboard | Dashboard.vue | 13-system-admin-ops.md | 支撑能力 | 首页仪表盘 |
| /documents | SystemDocumentCenter.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文控中心 |
| /documents/upload/:level | DocumentUpload.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文件上传 |
| /documents/:id | DocumentDetail.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文件详情 |
| /documents/:id/edit | DocumentUpload.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文件编辑 |
| /documents/control/library | — | 03-document-control-and-record-forms.md | 残留模块 | 路由存在但无 component（redirect 到 /documents），见 GAP-004 |
| /documents/control/record-form-index | RecordFormLandingIndex.vue | 03-document-control-and-record-forms.md | 已覆盖 | 283 张表单落地索引，见 GAP-403 |
| /documents/control/number-rules | NumberRuleCenter.vue | 03-document-control-and-record-forms.md | 已覆盖 | 编号规则管理 |
| /documents/control/workbench | DocumentControlWorkbench.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文控工作台 |
| /documents/control/workbench/issues | DocumentControlIssueList.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文控问题列表 |
| /documents/operations/read-confirmations | ReadConfirmationCenter.vue | 03-document-control-and-record-forms.md | 已覆盖 | 阅读确认 |
| /documents/operations/training-needs | TrainingNeedCenter.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文控派生培训需求，见 GAP-402 |
| /documents/operations/health | DocumentHealthDashboard.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文件健康度 |
| /documents/operations/audit-coverage | AuditCoverageCenter.vue | 03-document-control-and-record-forms.md | 已覆盖 | 审核覆盖 |
| /documents/operations/impact | ImpactAnalysisWorkbench.vue | 03-document-control-and-record-forms.md | 已覆盖 | 影响分析 |
| /documents/operations/audit-chain | AuditChainExplorer.vue | 03-document-control-and-record-forms.md | 已覆盖 | 审核链路浏览 |
| /templates | TemplateList.vue | 03-document-control-and-record-forms.md | 已覆盖 | 记录模板列表 |
| /templates/create | TemplateEdit.vue | 03-document-control-and-record-forms.md | 已覆盖 | 新建模板 |
| /templates/:id/edit | TemplateEdit.vue | 03-document-control-and-record-forms.md | 已覆盖 | 编辑模板 |
| /templates/:id/tolerance | ToleranceConfig.vue | 03-document-control-and-record-forms.md | 已覆盖 | 公差配置 |
| /deviation-reports | DeviationReportView.vue | 12-task-approval-workflow.md | 已覆盖 | 偏差报告 |
| /deviation-analytics | DeviationAnalytics.vue | 12-task-approval-workflow.md | 已覆盖 | 偏差分析 |
| /approvals | ApprovalList.vue | 12-task-approval-workflow.md | 已覆盖 | 审批列表 |
| /approvals/pending | ApprovalPending.vue | 12-task-approval-workflow.md | 已覆盖 | 待审批 |
| /approvals/detail/:id | ApprovalDetail.vue | 12-task-approval-workflow.md | 已覆盖 | 审批详情 |
| /approvals/history | ApprovalHistory.vue | 12-task-approval-workflow.md | 已覆盖 | 审批历史 |
| /approvals/all | ApprovalAll.vue | 12-task-approval-workflow.md | 已覆盖 | 全部审批 |
| /tasks | TaskList.vue | 12-task-approval-workflow.md | 已覆盖 | 任务列表 |
| /tasks/create | TaskCreate.vue | 12-task-approval-workflow.md | 已覆盖 | 创建任务 |
| /tasks/:id | TaskDetail.vue | 12-task-approval-workflow.md | 已覆盖 | 任务详情 |
| /i18n | I18nManager.vue | 13-system-admin-ops.md | 支撑能力 | 国际化管理 |
| /notifications | NotificationList.vue | 13-system-admin-ops.md | 支撑能力 | 通知列表 |
| /users | UserList.vue | 13-system-admin-ops.md | 支撑能力 | 用户管理 |
| /roles | RoleList.vue | 13-system-admin-ops.md | 支撑能力 | 角色管理 |
| /permissions | PermissionList.vue | 13-system-admin-ops.md | 支撑能力 | 权限列表 |
| /permissions/fine-grained | FineGrainedPermission.vue | 13-system-admin-ops.md | 支撑能力 | 细粒度权限 |
| /permissions/department | DepartmentPermission.vue | 13-system-admin-ops.md | 支撑能力 | 部门权限 |
| /permissions/audit-log | PermissionAuditLog.vue | 13-system-admin-ops.md | 支撑能力 | 权限审计日志，见 GAP-506 |
| /password | Password.vue | 13-system-admin-ops.md | 支撑能力 | 密码修改 |
| /statistics | StatisticsIndex.vue | 13-system-admin-ops.md | 支撑能力 | 统计首页 |
| /statistics/overview | Overview.vue | 13-system-admin-ops.md | 支撑能力 | 概览统计 |
| /statistics/documents | DocumentStatistics.vue | 03-document-control-and-record-forms.md | 支撑能力 | 文件统计 |
| /statistics/tasks | TaskStatistics.vue | 12-task-approval-workflow.md | 支撑能力 | 任务统计 |
| /recycle-bin | RecycleBin.vue | 13-system-admin-ops.md | 支撑能力 | 回收站 |
| /users/:id/permissions | UserPermissions.vue | 13-system-admin-ops.md | 支撑能力 | 用户权限详情 |
| /admin/user-permissions | UserPermissionsManager.vue | 13-system-admin-ops.md | 支撑能力 | 用户权限管理 |
| /admin/permissions | PermissionDefinitions.vue | 13-system-admin-ops.md | 支撑能力 | 权限定义 |
| /templates/designer | TemplateDesigner.vue | 03-document-control-and-record-forms.md | 已覆盖 | 模板设计器 |
| /record-templates/:id/designer | TemplateDesigner.vue | 03-document-control-and-record-forms.md | 已覆盖 | 记录模板设计器 |
| /workflow/templates | TemplateList.vue (workflow) | 12-task-approval-workflow.md | 已覆盖 | 工作流模板 |
| /workflow/templates/create | TemplateEditor.vue | 12-task-approval-workflow.md | 已覆盖 | 新建工作流模板 |
| /workflow/templates/:id/edit | TemplateEditor.vue | 12-task-approval-workflow.md | 已覆盖 | 编辑工作流模板 |
| /workflow/designer | WorkflowDesigner.vue | 12-task-approval-workflow.md | 已覆盖 | 工作流设计器 |
| /workflow-templates/designer | WorkflowDesigner.vue | 12-task-approval-workflow.md | 残留模块 | 与 /workflow/designer 重复，旧入口 |
| /my-todos | MyTodos.vue | 12-task-approval-workflow.md | 已覆盖 | 我的待办 |
| /workflow/my-tasks | MyTasks.vue | 12-task-approval-workflow.md | 已覆盖 | 工作流我的任务 |
| /workflow/instances | InstanceList.vue | 12-task-approval-workflow.md | 已覆盖 | 工作流实例列表 |
| /workflow/instances/:id | InstanceDetail.vue | 12-task-approval-workflow.md | 已覆盖 | 工作流实例详情 |
| /workflow/statistics | WorkflowStatistics.vue | 12-task-approval-workflow.md | 已覆盖 | 工作流统计 |
| /records | RecordList.vue | 03-document-control-and-record-forms.md | 已覆盖 | 记录列表 |
| /records/:id | RecordDetail.vue | 03-document-control-and-record-forms.md | 已覆盖 | 记录详情 |
| /records/fill/:templateId | RecordFill.vue | 03-document-control-and-record-forms.md | 已覆盖 | 填写记录 |
| /records/task/:instanceId | RecordFill.vue | 03-document-control-and-record-forms.md | 已覆盖 | 任务式填写记录 |
| /record-tasks/my | RecordTaskInstanceList.vue | 12-task-approval-workflow.md | 已覆盖 | 我的记录任务 |
| /record-tasks/manage | RecordTaskAssignmentList.vue | 12-task-approval-workflow.md | 已覆盖 | 记录任务管理 |
| /batch-trace | BatchList.vue | 06-mixing-production-packaging.md | 已覆盖 | 批次列表 |
| /batch-trace/query | — | 08-traceability-complaint-recall.md | 已覆盖 | 追溯查询（component 动态加载） |
| /batch-trace/report | — | 08-traceability-complaint-recall.md | 已覆盖 | 追溯报告 |
| /batch-trace/:id | BatchDetail.vue | 06-mixing-production-packaging.md | 已覆盖 | 批次详情，见 GAP-202 |
| /production/workshop-staging | WorkshopStaging.vue | 06-mixing-production-packaging.md | 已覆盖 | 车间暂存区 |
| /warehouse/materials | MaterialList.vue | 05-warehouse-inventory.md | 已覆盖 | 物料列表 |
| /warehouse/batches | BatchManagement.vue | 05-warehouse-inventory.md | 已覆盖 | 批次管理，见 GAP-104 |
| /warehouse/requisitions | RequisitionList.vue | 05-warehouse-inventory.md | 已覆盖 | 领料单 |
| /warehouse/suppliers | SupplierList.vue | 04-supplier-procurement-incoming.md | 已覆盖 | 供应商列表 |
| /warehouse/staging-area | StagingArea.vue | 06-mixing-production-packaging.md | 已覆盖 | 暂存区管理 |
| /mixing/workbench | MixingWorkbench.vue | 06-mixing-production-packaging.md | 已覆盖 | 配料工作台 |
| /warehouse/material-balance | MaterialBalance.vue | 05-warehouse-inventory.md | 已覆盖 | 物料平衡 |
| /warehouse/traceability | — | 08-traceability-complaint-recall.md | 残留模块 | 旧追溯入口，无 component 声明，GAP-312 已标注废弃 |
| /traceability | TraceabilityQuery.vue | 08-traceability-complaint-recall.md | 已覆盖 | 追溯查询权威入口 |
| /equipment | EquipmentList.vue | 10-equipment-and-measuring.md | 已覆盖 | 设备台账列表 |
| /equipment/stats | EquipmentStats.vue | 10-equipment-and-measuring.md | 已覆盖 | 设备统计 |
| /equipment/:id | EquipmentDetail.vue | 10-equipment-and-measuring.md | 已覆盖 | 设备详情 |
| /equipment/plans | PlanList.vue | 10-equipment-and-measuring.md | 已覆盖 | 保养计划 |
| /equipment/plans/calendar | PlanCalendar.vue | 10-equipment-and-measuring.md | 已覆盖 | 保养日历 |
| /equipment/records | RecordList.vue (equipment) | 10-equipment-and-measuring.md | 已覆盖 | 保养记录 |
| /equipment/records/create | RecordForm.vue | 10-equipment-and-measuring.md | 已覆盖 | 新建保养记录 |
| /equipment/records/:id | RecordDetail.vue (equipment) | 10-equipment-and-measuring.md | 已覆盖 | 保养记录详情 |
| /equipment/faults | FaultList.vue | 10-equipment-and-measuring.md | 已覆盖 | 故障记录列表 |
| /equipment/faults/create | FaultCreate.vue | 10-equipment-and-measuring.md | 已覆盖 | 新建故障 |
| /equipment/faults/stats | FaultStats.vue | 10-equipment-and-measuring.md | 已覆盖 | 故障统计 |
| /equipment/faults/:id | FaultDetail.vue | 10-equipment-and-measuring.md | 已覆盖 | 故障详情 |
| /training/plans | PlanList.vue (training) | 11-training-internal-audit.md | 已覆盖 | 培训计划 |
| /training/plans/:id | PlanDetail.vue | 11-training-internal-audit.md | 已覆盖 | 培训计划详情 |
| /training/projects | ProjectList.vue | 11-training-internal-audit.md | 已覆盖 | 培训项目 |
| /training/projects/create | ProjectForm.vue | 11-training-internal-audit.md | 已覆盖 | 新建培训项目 |
| /training/projects/:id | ProjectDetail.vue | 11-training-internal-audit.md | 已覆盖 | 培训项目详情 |
| /training/projects/:id/edit | ProjectForm.vue | 11-training-internal-audit.md | 已覆盖 | 编辑培训项目 |
| /training/projects/:id/questions | QuestionManage.vue | 11-training-internal-audit.md | 已覆盖 | 题目管理 |
| /training/exam/:projectId | ExamPage.vue | 11-training-internal-audit.md | 已覆盖 | 考试页面 |
| /training/statistics | StatisticsPage.vue (training) | 11-training-internal-audit.md | 已覆盖 | 培训统计 |
| /training/archives | ArchiveList.vue | 11-training-internal-audit.md | 已覆盖 | 培训档案，见 GAP-408 |
| /training/archives/:id | ArchiveDetail.vue | 11-training-internal-audit.md | 已覆盖 | 培训档案详情 |
| /internal-audit/plans | PlanList.vue (audit) | 11-training-internal-audit.md | 已覆盖 | 内审计划，见 GAP-407 |
| /internal-audit/plans/:id/execute | AuditExecute.vue | 11-training-internal-audit.md | 已覆盖 | 内审执行 |
| /internal-audit/rectifications | RectificationList.vue | 11-training-internal-audit.md | 已覆盖 | 整改列表 |
| /internal-audit/verifications | VerificationList.vue | 11-training-internal-audit.md | 已覆盖 | 验证列表 |
| /internal-audit/reports | ReportList.vue | 11-training-internal-audit.md | 已覆盖 | 内审报告列表 |
| /internal-audit/reports/:id | ReportDetail.vue | 11-training-internal-audit.md | 已覆盖 | 内审报告详情 |
| /monitoring/dashboard | Dashboard.vue (monitoring) | 13-system-admin-ops.md | 支撑能力 | 监控仪表盘 |
| /monitoring/metrics | MetricsPage.vue | 13-system-admin-ops.md | 支撑能力 | 指标页，见 GAP-507 |
| /monitoring/alerts/rules | AlertRuleList.vue | 13-system-admin-ops.md | 支撑能力 | 告警规则 |
| /monitoring/alerts/history | AlertHistoryList.vue | 13-system-admin-ops.md | 支撑能力 | 告警历史，见 GAP-508 |
| /audit/login-logs | LoginLogList.vue | 13-system-admin-ops.md | 支撑能力 | 登录日志 |
| /audit/permission-logs | PermissionLogList.vue | 13-system-admin-ops.md | 支撑能力 | 权限日志 |
| /audit/sensitive-logs | SensitiveLogList.vue | 13-system-admin-ops.md | 支撑能力 | 敏感操作日志 |
| /audit/search | AuditSearchPage.vue | 13-system-admin-ops.md | 支撑能力 | 审计搜索 |
| /backup/manage | BackupManage.vue | 13-system-admin-ops.md | 支撑能力 | 备份管理，见 GAP-509/510 |
| /health | HealthPage.vue | 13-system-admin-ops.md | 基础设施 | 系统健康检查 |
| /search | AdvancedSearch.vue | 13-system-admin-ops.md | 支撑能力 | 全文搜索 |
| /admin/export | ExportPage.vue | 13-system-admin-ops.md | 支撑能力 | 数据导出 |
| /admin/import | ImportPage.vue | 13-system-admin-ops.md | 支撑能力 | 数据导入 |
| /statistics/dashboard | StatisticsDashboard.vue | 13-system-admin-ops.md | 支撑能力 | 统计仪表盘 |
| /ccp/records | CcpRecordList.vue | 07-quality-qc-release.md | 已覆盖 | CCP 记录，见 GAP-303 |
| /non-conformances | NonConformanceList.vue | 09-nonconformance-capa.md | 已覆盖 | 不合格品列表 |
| /corrective-actions | CorrectiveActionList.vue | 09-nonconformance-capa.md | 已覆盖 | CAPA 列表 |
| /corrective-actions/:id | CapaDetail.vue | 09-nonconformance-capa.md | 已覆盖 | CAPA 详情 |
| /customer-complaints | CustomerComplaintList.vue | 08-traceability-complaint-recall.md | 已覆盖 | 顾客投诉，见 GAP-309 |
| /environment-records | EnvironmentRecordList.vue | 07-quality-qc-release.md | 已覆盖 | 环境记录，见 GAP-300 |
| /process-records | ProcessRecordList.vue | 07-quality-qc-release.md | 已覆盖 | 生产过程记录 |
| /metal-detections | MetalDetectionList.vue | 07-quality-qc-release.md | 已覆盖 | 金属检测 |
| /cleaning-records | CleaningRecordList.vue | 07-quality-qc-release.md | 已覆盖 | 清洁记录 |
| /violation-records | ViolationRecordList.vue | 07-quality-qc-release.md | 已覆盖 | 违规记录 |
| /medication-records | MedicationRecordList.vue | 07-quality-qc-release.md | 已覆盖 | 用药记录 |
| /measuring-equipment | EquipmentList.vue (measuring) | 10-equipment-and-measuring.md | 已覆盖 | 计量器具列表 |
| /supplier-evaluations | EvaluationList.vue | 04-supplier-procurement-incoming.md | 已覆盖 | 供应商评估，见 GAP-105 |
| /change-events | ChangeEventList.vue | 12-task-approval-workflow.md | 已覆盖 | 变更事件 |
| /waste | WasteManagement.vue | 07-quality-qc-release.md | 已覆盖 | 废弃物管理 |
| /process | ProcessList.vue | 02-master-data-and-boundaries.md | 已覆盖 | 研发工艺流程 |
| /process/instances/:id | ProcessDetail.vue | 02-master-data-and-boundaries.md | 已覆盖 | 研发流程实例 |
| /visitor-records | VisitorRecordList.vue | 07-quality-qc-release.md | 已覆盖 | 访客记录 |
| /emergency-drills | EmergencyDrillList.vue | 07-quality-qc-release.md | 已覆盖 | 应急演练 |
| /incoming-inspections | IncomingInspectionList.vue | 04-supplier-procurement-incoming.md | 已覆盖 | 来料检验，见 GAP-100 |
| /products | ProductList.vue | 02-master-data-and-boundaries.md | 已覆盖 | 产品主数据 |
| /products/by-plan/:planId | ProductByPlanRedirect.vue | 02-master-data-and-boundaries.md | 已覆盖 | 按计划跳转产品 |
| /products/:id | ProductDetail.vue | 02-master-data-and-boundaries.md | 已覆盖 | 产品详情 |
| /recipes | — | 02-master-data-and-boundaries.md | 残留模块 | 静默重定向到 /products，见 GAP-004 |
| /recipes/:id/edit | — | 02-master-data-and-boundaries.md | 残留模块 | 静默重定向到 /products，见 GAP-004 |
| /process-steps | — | 02-master-data-and-boundaries.md | 残留模块 | 静默重定向到 /products，见 GAP-004 |
| /rework-records | ReworkRecordList.vue | 09-nonconformance-capa.md | 已覆盖 | 返工记录 |
| /fragile-item-inspections | FragileItemInspectionList.vue | 07-quality-qc-release.md | 已覆盖 | 脆弱物品检查 |
| /asset-loan-records | AssetLoanRecordList.vue | 13-system-admin-ops.md | 支撑能力 | 资产借用记录 |
| /document-issuances | DocumentIssuanceList.vue | 03-document-control-and-record-forms.md | 已覆盖 | 文件发放，见 GAP-401 |
| /line-change-check-records | LineChangeCheckRecordList.vue | 07-quality-qc-release.md | 已覆盖 | 换线检查记录 |
| /food-safety-culture-records | FoodSafetyCultureRecordList.vue | 07-quality-qc-release.md | 已覆盖 | 食品安全文化记录 |
| /external-parties | ExternalPartyList.vue | 04-supplier-procurement-incoming.md | 已覆盖 | 外部方管理 |
| /packaging-material-usages | PackagingMaterialUsageList.vue | 06-mixing-production-packaging.md | 已覆盖 | 包材用量，见 GAP-203 |
| /shift-dashboard | ShiftDashboard.vue | 06-mixing-production-packaging.md | 已覆盖 | 班次仪表盘 |
| /management-dashboard | ManagementDashboard.vue | 13-system-admin-ops.md | 支撑能力 | 管理层仪表盘 |

---

## 2. 后端模块覆盖表

| 后端模块 | 所属模块文档 | 模块类型 | 状态 | 备注 |
|---|---|---|---|---|
| alert | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 告警规则和历史，见 GAP-511 |
| approval | 12-task-approval-workflow.md | 支撑能力 | 已覆盖 | 旧审批平台，见 GAP-502 |
| asset-loan-record | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 资产借用 |
| audit | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 登录/权限/敏感操作日志 |
| auth | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 认证/授权，见 GAP-501 |
| backup | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 数据备份，见 GAP-509/510 |
| batch-trace | 06-mixing-production-packaging.md | 业务主链 | 已覆盖 | 生产批次/物料批次追溯 |
| ccp | 07-quality-qc-release.md | 业务主链 | 已覆盖 | CCP 记录，见 GAP-303/305 |
| change-approval | 12-task-approval-workflow.md | 支撑能力 | 已覆盖 | 变更审批 |
| change-compliance-record | 12-task-approval-workflow.md | 业务主链 | 已覆盖 | 变更合规记录 |
| change-event | 12-task-approval-workflow.md | 业务主链 | 已覆盖 | 变更事件 |
| change-verification-record | 12-task-approval-workflow.md | 业务主链 | 已覆盖 | 变更验证记录 |
| cleaning-record | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 清洁记录 |
| corrective-action | 09-nonconformance-capa.md | 业务主链 | 已覆盖 | CAPA，见 GAP-314/316 |
| customer-complaint | 08-traceability-complaint-recall.md | 业务主链 | 已覆盖 | 顾客投诉，见 GAP-309/310 |
| department | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 部门管理 |
| department-permission | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 部门权限 |
| deviation | 12-task-approval-workflow.md | 业务主链 | 已覆盖 | 偏差报告 |
| document | 03-document-control-and-record-forms.md | 业务主链 | 已覆盖 | 受控文件，见 GAP-400/405/406 |
| document-issuance | 03-document-control-and-record-forms.md | 业务主链 | 已覆盖 | 文件发放，见 GAP-401 |
| emergency-drill | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 应急演练 |
| environment-record | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 环境记录，见 GAP-300/302 |
| equipment | 10-equipment-and-measuring.md | 业务主链 | 已覆盖 | 设备台账/保养/故障，见 GAP-601 |
| export | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 数据导出 |
| external-party | 04-supplier-procurement-incoming.md | 支撑能力 | 已覆盖 | 外部方主数据 |
| fine-grained-permission | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 细粒度权限 |
| food-safety-culture-record | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 食品安全文化记录 |
| fragile-item-inspection | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 异物检查，见 GAP-301 |
| health | 13-system-admin-ops.md | 基础设施 | 已覆盖 | 服务健康检查 |
| import | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 数据导入 |
| incoming-inspection | 04-supplier-procurement-incoming.md | 业务主链 | 已覆盖 | 来料检验，见 GAP-100 |
| internal-audit | 11-training-internal-audit.md | 业务主链 | 已覆盖 | 内审，见 GAP-407/410/411 |
| line-change-check-record | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 换线检查 |
| measuring-equipment | 10-equipment-and-measuring.md | 业务主链 | 已覆盖 | 计量器具，见 GAP-600/602/605 |
| medication-record | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 用药记录 |
| metal-detection | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 金属检测 |
| mixing | 06-mixing-production-packaging.md | 业务主链 | 已覆盖 | 配料执行 |
| mobile | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 移动端上传/同步 |
| model-landing | 03-document-control-and-record-forms.md | 支撑能力 | 已覆盖 | 表单落地自动建议，见 GAP-403 |
| monitoring | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 指标监控，见 GAP-507/508 |
| non-conformance | 09-nonconformance-capa.md | 业务主链 | 已覆盖 | 不合格品，见 GAP-313/314/315 |
| notification | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 通知推送 |
| operation-log | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 操作日志 |
| packaging-material-usage | 06-mixing-production-packaging.md | 业务主链 | 已覆盖 | 包材用量，见 GAP-203 |
| permission | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 权限模型，见 GAP-512；决策指南见 [2026-05-01-permission-model-decision-guide.md](../superpowers/specs/2026-05-01-permission-model-decision-guide.md) |
| process | 02-master-data-and-boundaries.md | 业务主链 | 已覆盖 | 研发工艺流程，见 GAP-001/006 |
| process-record | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 生产过程记录 |
| process-step | 02-master-data-and-boundaries.md | 业务主链 | 已覆盖 | 工序，见 GAP-005 |
| product | 02-master-data-and-boundaries.md | 业务主链 | 已覆盖 | 产品主数据 |
| product-process-change | 12-task-approval-workflow.md | 业务主链 | 已覆盖 | 产品工艺变更 |
| production-run | 06-mixing-production-packaging.md | 业务主链 | 已覆盖 | 生产运行记录 |
| recipe | 02-master-data-and-boundaries.md | 业务主链 | 已覆盖 | 配方主数据 |
| record | 03-document-control-and-record-forms.md | 业务主链 | 已覆盖 | 动态记录 |
| record-task | 12-task-approval-workflow.md | 业务主链 | 已覆盖 | 记录任务派发，见 GAP-504 |
| record-template | 03-document-control-and-record-forms.md | 业务主链 | 已覆盖 | 记录模板，见 GAP-404 |
| recycle-bin | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 回收站 |
| redis | 13-system-admin-ops.md | 基础设施 | 已覆盖 | Redis 缓存 |
| rework-record | 09-nonconformance-capa.md | 业务主链 | 已覆盖 | 返工记录，见 GAP-318 |
| role | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 角色管理 |
| scheduled-task | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 定时任务调度 |
| search | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 全文搜索 |
| shift-instance | 06-mixing-production-packaging.md | 业务主链 | 已覆盖 | 班次实例，见 GAP-200/207 |
| statistics | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 统计分析 |
| supplier-evaluation | 04-supplier-procurement-incoming.md | 业务主链 | 已覆盖 | 供应商评估，见 GAP-105 |
| system-config | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 系统配置 |
| task | 12-task-approval-workflow.md | 业务主链 | 已覆盖 | 任务管理，见 GAP-504 |
| team-shift | 06-mixing-production-packaging.md | 业务主链 | 已覆盖 | 班组排班 |
| todo | 12-task-approval-workflow.md | 支撑能力 | 已覆盖 | 待办 |
| traceability | 08-traceability-complaint-recall.md | 业务主链 | 已覆盖 | 追溯，见 GAP-306/307/308 |
| training | 11-training-internal-audit.md | 业务主链 | 已覆盖 | 培训，见 GAP-408/409/412 |
| unified-approval | 12-task-approval-workflow.md | 业务主链 | 已覆盖 | 统一审批平台，见 GAP-502/503 |
| upload | 13-system-admin-ops.md | 基础设施 | 已覆盖 | 文件上传 |
| user | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 用户管理，见 GAP-505 |
| user-permission | 13-system-admin-ops.md | 支撑能力 | 已覆盖 | 用户权限 |
| violation-record | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 违规记录 |
| visitor-record | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 访客记录 |
| warehouse | 05-warehouse-inventory.md | 业务主链 | 已覆盖 | 仓储物料/批次/领料/平衡 |
| waste | 07-quality-qc-release.md | 业务主链 | 已覆盖 | 废弃物 |
| workflow | 12-task-approval-workflow.md | 支撑能力 | 已覆盖 | 工作流引擎，见 GAP-503 |
| workflow-triggers | 12-task-approval-workflow.md | 支撑能力 | 已覆盖 | 工作流触发器 |
| workshop-area | 06-mixing-production-packaging.md | 支撑能力 | 已覆盖 | 车间区域主数据 |

---

## 3. Prisma 模型覆盖表

| Prisma 模型 | 业务对象类型 | 所属业务链 | 所属模块文档 | 是否事实源 | 备注 |
|---|---|---|---|---|---|
| User | 系统能力 | 系统 | 13-system-admin-ops.md | 事实源 | 用户主数据 |
| Department | 系统能力 | 系统 | 13-system-admin-ops.md | 事实源 | 部门主数据 |
| NumberRule | 系统能力 | 系统 | 03-document-control-and-record-forms.md | 事实源 | 编号规则 |
| PendingNumber | 系统能力 | 系统 | 03-document-control-and-record-forms.md | 投影 | 待用编号池 |
| Document | 主数据 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 受控文件台账，见 GAP-400 |
| DocumentVersion | 过程记录 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 文件版本记录，见 GAP-406 |
| Approval | 治理记录 | 审批 | 12-task-approval-workflow.md | 事实源 | 旧审批记录，见 GAP-502 |
| ApprovalDefinition | 主数据 | 审批 | 12-task-approval-workflow.md | 事实源 | 统一审批定义 |
| ApprovalInstance | 过程记录 | 审批 | 12-task-approval-workflow.md | 事实源 | 统一审批实例 |
| ApprovalTask | 过程记录 | 审批 | 12-task-approval-workflow.md | 事实源 | 审批任务节点 |
| ApprovalAction | 审计/日志 | 审批 | 12-task-approval-workflow.md | 投影 | 审批动作记录 |
| OperationLog | 审计/日志 | 系统 | 13-system-admin-ops.md | 事实源 | 操作日志 |
| Notification | 系统能力 | 系统 | 13-system-admin-ops.md | 事实源 | 通知消息 |
| DeviationReport | 治理记录 | 审批 | 12-task-approval-workflow.md | 事实源 | 偏差报告 |
| Role | 主数据 | 系统 | 13-system-admin-ops.md | 事实源 | 角色主数据 |
| Permission | 主数据 | 系统 | 13-system-admin-ops.md | 事实源 | 权限定义 |
| RolePermission | 桥接关系 | 系统 | 13-system-admin-ops.md | — | 角色-权限映射 |
| FineGrainedPermission | 主数据 | 系统 | 13-system-admin-ops.md | 事实源 | 细粒度权限，见 GAP-512 |
| UserPermission | 桥接关系 | 系统 | 13-system-admin-ops.md | — | 用户-权限覆盖 |
| WorkflowTemplate | 主数据 | 工作流 | 12-task-approval-workflow.md | 事实源 | 工作流模板 |
| WorkflowInstance | 过程记录 | 工作流 | 12-task-approval-workflow.md | 事实源 | 工作流实例 |
| WorkflowTask | 过程记录 | 工作流 | 12-task-approval-workflow.md | 事实源 | 工作流任务节点 |
| RecordTemplate | 主数据 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 记录模板，见 GAP-404 |
| Record | 过程记录 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 动态表单记录 |
| RecordChangeLog | 审计/日志 | 文控 | 03-document-control-and-record-forms.md | — | 记录变更日志 |
| MaterialCategory | 主数据 | 供应链 | 05-warehouse-inventory.md | 事实源 | 物料分类 |
| Material | 主数据 | 供应链 | 05-warehouse-inventory.md | 事实源 | 物料主数据 |
| MaterialBatch | 批次数据 | 供应链 | 05-warehouse-inventory.md | 事实源 | 物料批次，见 GAP-101/106 |
| StockRecord | 过程记录 | 供应链 | 05-warehouse-inventory.md | 事实源 | 库存流水事实源，见 GAP-102 |
| MaterialRequisition | 过程记录 | 供应链 | 05-warehouse-inventory.md | 事实源 | 领料单，见 GAP-110/GAP-603 |
| MaterialRequisitionItem | 桥接关系 | 供应链 | 05-warehouse-inventory.md | — | 领料单明细 |
| Supplier | 主数据 | 供应链 | 04-supplier-procurement-incoming.md | 事实源 | 供应商主数据，见 GAP-103 |
| SupplierQualification | 过程记录 | 供应链 | 04-supplier-procurement-incoming.md | 事实源 | 供应商资质 |
| StagingAreaStock | 批次数据 | 生产 | 06-mixing-production-packaging.md | 事实源 | 配料区库存 |
| StagingAreaRecord | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 配料区进出记录 |
| StagingAreaTransfer | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 配料区调拨 |
| StagingAreaStocktake | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 配料区盘点，见 GAP-206 |
| MixingExecution | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 配料执行记录，见 GAP-204 |
| MixingExecutionLine | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 配料执行明细 |
| BatchMixingAggregation | 桥接关系 | 生产 | 06-mixing-production-packaging.md | — | 配料-批次归集，见 GAP-201 |
| MaterialBalance | 过程记录 | 生产 | 05-warehouse-inventory.md | 投影 | 物料平衡汇总，见 GAP-107 |
| MaterialInbound | 过程记录 | 供应链 | 04-supplier-procurement-incoming.md | 事实源 | 入库单 |
| MaterialInboundItem | 桥接关系 | 供应链 | 04-supplier-procurement-incoming.md | — | 入库单明细 |
| MaterialReturn | 过程记录 | 供应链 | 05-warehouse-inventory.md | 事实源 | 退料单 |
| MaterialReturnItem | 桥接关系 | 供应链 | 05-warehouse-inventory.md | — | 退料单明细 |
| MaterialScrap | 过程记录 | 供应链 | 05-warehouse-inventory.md | 事实源 | 报废单 |
| MaterialScrapItem | 桥接关系 | 供应链 | 05-warehouse-inventory.md | — | 报废单明细 |
| ProductionBatch | 批次数据 | 生产 | 06-mixing-production-packaging.md | 事实源 | 生产批次主键，见 GAP-002/003/007 |
| BatchMaterialUsage | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 旧投料记录，见 GAP-202 |
| SystemConfig | 系统能力 | 系统 | 13-system-admin-ops.md | 事实源 | 系统配置 |
| Equipment | 主数据 | 设备 | 10-equipment-and-measuring.md | 事实源 | 设备台账 |
| MaintenancePlan | 过程记录 | 设备 | 10-equipment-and-measuring.md | 事实源 | 保养计划（调度生成） |
| MaintenanceRecord | 治理记录 | 设备 | 10-equipment-and-measuring.md | 事实源 | 保养执行记录，含审批状态机 |
| EquipmentFault | 过程记录 | 设备 | 10-equipment-and-measuring.md | 事实源 | 故障记录 |
| MobileUpload | 系统能力 | 系统 | 13-system-admin-ops.md | 事实源 | 移动端上传记录 |
| SyncSubmission | 系统能力 | 系统 | 13-system-admin-ops.md | 事实源 | 移动端同步提交 |
| LoginLog | 审计/日志 | 系统 | 13-system-admin-ops.md | 事实源 | 登录日志 |
| PermissionLog | 审计/日志 | 系统 | 13-system-admin-ops.md | 事实源 | 权限操作日志 |
| SensitiveLog | 审计/日志 | 系统 | 13-system-admin-ops.md | 事实源 | 敏感操作日志 |
| SystemMetric | 系统能力 | 系统 | 13-system-admin-ops.md | 事实源 | 系统指标 |
| AlertRule | 主数据 | 系统 | 13-system-admin-ops.md | 事实源 | 告警规则 |
| AlertHistory | 过程记录 | 系统 | 13-system-admin-ops.md | 事实源 | 告警历史 |
| BackupHistory | 过程记录 | 系统 | 13-system-admin-ops.md | 事实源 | 备份历史 |
| TodoTask | 系统能力 | 系统 | 12-task-approval-workflow.md | 事实源 | 待办任务 |
| TrainingPlan | 主数据 | 培训 | 11-training-internal-audit.md | 事实源 | 培训计划 |
| TrainingProject | 过程记录 | 培训 | 11-training-internal-audit.md | 事实源 | 培训项目，见 GAP-409/412 |
| TrainingQuestion | 主数据 | 培训 | 11-training-internal-audit.md | 事实源 | 培训题目 |
| LearningRecord | 过程记录 | 培训 | 11-training-internal-audit.md | 事实源 | 学习记录 |
| ExamRecord | 过程记录 | 培训 | 11-training-internal-audit.md | 事实源 | 考试记录 |
| TrainingArchive | 治理记录 | 培训 | 11-training-internal-audit.md | 事实源 | 培训档案，见 GAP-408 |
| AuditPlan | 主数据 | 内审 | 11-training-internal-audit.md | 事实源 | 内审计划 |
| AuditFinding | 过程记录 | 内审 | 11-training-internal-audit.md | 事实源 | 内审不符合项，见 GAP-410 |
| AuditReport | 治理记录 | 内审 | 11-training-internal-audit.md | 事实源 | 内审报告，见 GAP-405/413 |
| DocumentViewLog | 审计/日志 | 文控 | 03-document-control-and-record-forms.md | — | 文件查阅日志 |
| DocumentRecommendation | 投影 | 文控 | 03-document-control-and-record-forms.md | 投影 | AI 文件推荐 |
| FulltextIndex | 系统能力 | 系统 | 13-system-admin-ops.md | 投影 | 全文索引 |
| DelegationLog | 审计/日志 | 系统 | 12-task-approval-workflow.md | — | 授权委托日志 |
| RoleFineGrainedPermission | 桥接关系 | 系统 | 13-system-admin-ops.md | — | 角色-细粒度权限映射 |
| DepartmentPermission | 主数据 | 系统 | 13-system-admin-ops.md | 事实源 | 部门权限配置，见 GAP-512 |
| RecordTaskAssignment | 主数据 | 任务 | 12-task-approval-workflow.md | 事实源 | 记录任务派发配置，见 GAP-504 |
| RecordTaskInstance | 过程记录 | 任务 | 12-task-approval-workflow.md | 事实源 | 记录任务实例 |
| ProcessTemplate | 主数据 | 研发 | 02-master-data-and-boundaries.md | 事实源 | 研发工艺模板 |
| ProcessInstance | 过程记录 | 研发 | 02-master-data-and-boundaries.md | 事实源 | 研发流程实例，见 GAP-001/006 |
| ProcessStepData | 过程记录 | 研发 | 02-master-data-and-boundaries.md | 事实源 | 研发步骤数据 |
| ProcessStepApproval | 过程记录 | 研发 | 02-master-data-and-boundaries.md | 事实源 | 研发步骤审批 |
| DocumentReference | 桥接关系 | 文控 | 03-document-control-and-record-forms.md | — | 文件引用关系 |
| BusinessDocumentLink | 桥接关系 | 文控 | 03-document-control-and-record-forms.md | — | 业务对象-文件关联 |
| RecordFormLandingEntry | 主数据 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 283 张表单落地映射，见 GAP-403 |
| AgentAction | 审计/日志 | 系统 | 13-system-admin-ops.md | — | Agent 操作记录 |
| SupplierDocument | 过程记录 | 供应链 | 04-supplier-procurement-incoming.md | 事实源 | 供应商证件 |
| IncomingInspection | 过程记录 | 供应链 | 04-supplier-procurement-incoming.md | 事实源 | 来料检验，见 GAP-100 |
| IncomingInspectionResult | 过程记录 | 供应链 | 04-supplier-procurement-incoming.md | 事实源 | 来料检验结果 |
| InventoryMovement | 历史兼容 | 供应链 | 05-warehouse-inventory.md | 投影 | 遗留模型，未被 service 调用，见 GAP-102 |
| StockCount | 过程记录 | 供应链 | 05-warehouse-inventory.md | 事实源 | 库存盘点 |
| DeliveryNote | 过程记录 | 供应链 | 08-traceability-complaint-recall.md | 事实源 | 发货单 |
| Sample | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 样品记录 |
| Product | 主数据 | 产品 | 02-master-data-and-boundaries.md | 事实源 | 产品主数据 |
| WorkshopArea | 主数据 | 生产 | 06-mixing-production-packaging.md | 事实源 | 车间区域，见 GAP-109 |
| Team | 主数据 | 生产 | 06-mixing-production-packaging.md | 事实源 | 班组 |
| TeamMember | 桥接关系 | 生产 | 06-mixing-production-packaging.md | — | 班组-成员映射 |
| ShiftType | 主数据 | 生产 | 06-mixing-production-packaging.md | 事实源 | 班次类型主数据，见 GAP-200 |
| TeamShiftSchedule | 主数据 | 生产 | 06-mixing-production-packaging.md | 事实源 | 排班表，见 GAP-207 |
| Recipe | 主数据 | 产品 | 02-master-data-and-boundaries.md | 事实源 | 配方主数据，见 GAP-003 |
| RecipeLine | 主数据 | 产品 | 02-master-data-and-boundaries.md | 事实源 | 配方行，见 GAP-008 |
| ProcessStep | 主数据 | 产品 | 02-master-data-and-boundaries.md | 事实源 | 工序，见 GAP-005 |
| CCPPoint | 主数据 | 品质 | 07-quality-qc-release.md | 事实源 | CCP 控制点 |
| CCPRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | CCP 执行记录，见 GAP-303/305 |
| InspectionStandard | 主数据 | 品质 | 07-quality-qc-release.md | 事实源 | 检验标准 |
| InspectionItem | 主数据 | 品质 | 07-quality-qc-release.md | 事实源 | 检验项目 |
| NonConformance | 治理记录 | 品质 | 09-nonconformance-capa.md | 事实源 | 不合格品，见 GAP-313/314/317 |
| CorrectiveAction | 治理记录 | 品质 | 09-nonconformance-capa.md | 事实源 | CAPA，见 GAP-314/316 |
| VerificationRecord | 过程记录 | 品质 | 09-nonconformance-capa.md | 事实源 | CAPA 验证记录 |
| CustomerComplaint | 治理记录 | 追溯 | 08-traceability-complaint-recall.md | 事实源 | 顾客投诉，见 GAP-309/310 |
| ReworkRecord | 过程记录 | 品质 | 09-nonconformance-capa.md | 事实源 | 返工记录，见 GAP-318 |
| MeasuringEquipment | 主数据 | 设备 | 10-equipment-and-measuring.md | 事实源 | 计量器具台账，见 GAP-600/602 |
| CalibrationRecord | 过程记录 | 设备 | 10-equipment-and-measuring.md | 事实源 | 校准记录，见 GAP-600/605 |
| EnvironmentRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 环境记录，见 GAP-300/302 |
| ProcessMonitorRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 生产过程监控记录 |
| MetalDetectionLog | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 金属检测日志 |
| CleaningRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 清洁记录 |
| ViolationRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 违规记录 |
| MedicationRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 用药记录 |
| VisitorRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 访客记录 |
| EmergencyDrillRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 应急演练记录 |
| ChangeEvent | 治理记录 | 变更 | 12-task-approval-workflow.md | 事实源 | 变更事件 |
| ProductProcessChangePlan | 过程记录 | 变更 | 12-task-approval-workflow.md | 事实源 | 产品工艺变更计划 |
| ChangeEventExecution | 过程记录 | 变更 | 12-task-approval-workflow.md | 事实源 | 变更执行 |
| ChangeEventExecutionArtifact | 过程记录 | 变更 | 12-task-approval-workflow.md | 事实源 | 变更执行产出物 |
| ChangeVerificationRecord | 过程记录 | 变更 | 12-task-approval-workflow.md | 事实源 | 变更验证记录 |
| ChangeEventRelation | 桥接关系 | 变更 | 12-task-approval-workflow.md | — | 变更事件关联 |
| ChangeEventFormTask | 过程记录 | 变更 | 12-task-approval-workflow.md | 事实源 | 变更表单任务 |
| WasteDisposalRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 废弃物处置记录 |
| WasteRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 废弃物记录 |
| SupplierEvaluation | 治理记录 | 供应链 | 04-supplier-procurement-incoming.md | 事实源 | 供应商评估，见 GAP-105 |
| DocumentIssuance | 过程记录 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 文件发放，见 GAP-401 |
| AssetLoanRecord | 过程记录 | 系统 | 13-system-admin-ops.md | 事实源 | 资产借用 |
| FragileItemInspection | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 异物检查，见 GAP-301 |
| ChangeComplianceRecord | 过程记录 | 变更 | 12-task-approval-workflow.md | 事实源 | 变更合规记录 |
| ChangeApproval | 治理记录 | 变更 | 12-task-approval-workflow.md | 事实源 | 变更审批 |
| LineChangeCheckRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 换线检查记录 |
| FoodSafetyCultureRecord | 过程记录 | 品质 | 07-quality-qc-release.md | 事实源 | 食品安全文化记录 |
| ExternalParty | 主数据 | 供应链 | 04-supplier-procurement-incoming.md | 事实源 | 外部方主数据 |
| PackagingMaterialUsage | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 包材用量，见 GAP-203 |
| ShiftInstance | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 班次实例，见 GAP-200/207 |
| ProductionRun | 过程记录 | 生产 | 06-mixing-production-packaging.md | 事实源 | 生产运行记录 |
| TraceabilitySnapshot | 治理记录 | 追溯 | 08-traceability-complaint-recall.md | 事实源 | 追溯快照，见 GAP-308 |
| DocumentReadConfirmation | 过程记录 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 阅读确认记录 |
| DocumentReadRequirement | 主数据 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 阅读要求配置 |
| DocumentTrainingNeed | 过程记录 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 文控派生培训需求，见 GAP-402 |
| DocumentImpactReview | 过程记录 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 文件影响评审 |
| DocumentImpactItem | 过程记录 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 影响评审项 |
| DocumentCoverageReview | 过程记录 | 文控 | 03-document-control-and-record-forms.md | 事实源 | 文件覆盖评审 |
| Task | 过程记录 | 任务 | 12-task-approval-workflow.md | 事实源 | 一次性任务，见 GAP-504 |
| TaskRecord | 过程记录 | 任务 | 12-task-approval-workflow.md | 事实源 | 任务执行记录 |

---

## 4. API 覆盖表

| 前端 API | 后端 Controller | 后端 Service | 所属模块文档 | 状态 | 备注 |
|---|---|---|---|---|---|
| approval.ts | approval.controller.ts | approval.service.ts | 12-task-approval-workflow.md | 已覆盖 | 含旧级别审批残留，见 GAP-500/502 |
| asset-loan-record.ts | asset-loan-record.controller.ts | asset-loan-record.service.ts | 13-system-admin-ops.md | 已覆盖 | — |
| audit.ts | audit.controller.ts | audit.service.ts | 13-system-admin-ops.md | 已覆盖 | 登录/权限/敏感日志 |
| backup.ts | backup.controller.ts | backup.service.ts | 13-system-admin-ops.md | 已覆盖 | 见 GAP-509/510（两个缺失端点） |
| batch.ts | batch-trace/controllers/*.controller.ts | batch-trace/services/*.service.ts | 06-mixing-production-packaging.md | 已覆盖 | — |
| ccp.ts | ccp.controller.ts | ccp.service.ts | 07-quality-qc-release.md | 已覆盖 | 见 GAP-303/305 |
| change-approval.ts | change-approval.controller.ts | change-approval.service.ts | 12-task-approval-workflow.md | 已覆盖 | — |
| change-compliance-record.ts | change-compliance-record.controller.ts | change-compliance-record.service.ts | 12-task-approval-workflow.md | 已覆盖 | — |
| change-event.ts | change-event.controller.ts | change-event.service.ts | 12-task-approval-workflow.md | 已覆盖 | — |
| change-verification-record.ts | change-verification-record.controller.ts | change-verification-record.service.ts | 12-task-approval-workflow.md | 已覆盖 | — |
| cleaning-record.ts | cleaning-record.controller.ts | cleaning-record.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| corrective-action.ts | corrective-action.controller.ts | corrective-action.service.ts | 09-nonconformance-capa.md | 已覆盖 | 见 GAP-314/316 |
| customer-complaint.ts | customer-complaint.controller.ts | customer-complaint.service.ts | 08-traceability-complaint-recall.md | 已覆盖 | 见 GAP-309/310 |
| department.ts | department.controller.ts | department.service.ts | 13-system-admin-ops.md | 已覆盖 | — |
| deviation-analytics.ts | deviation-analytics.controller.ts | deviation-analytics.service.ts | 12-task-approval-workflow.md | 已覆盖 | — |
| deviation.ts | deviation.controller.ts | deviation.service.ts | 12-task-approval-workflow.md | 已覆盖 | — |
| document-control.ts | document.controller.ts (部分) | document-control-workbench.service.ts | 03-document-control-and-record-forms.md | 已覆盖 | — |
| document-issuance.ts | document-issuance.controller.ts | document-issuance.service.ts | 03-document-control-and-record-forms.md | 已覆盖 | 见 GAP-401 |
| document-management.ts | document.controller.ts | document.service.ts | 03-document-control-and-record-forms.md | 已覆盖 | — |
| document-operations.ts | document.controller.ts (文控运营) | 多个 document/services/*.service.ts | 03-document-control-and-record-forms.md | 已覆盖 | — |
| emergency-drill.ts | emergency-drill.controller.ts | emergency-drill.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| environment-record.ts | environment-record.controller.ts | environment-record.service.ts | 07-quality-qc-release.md | 已覆盖 | 见 GAP-300/302 |
| equipment.ts | equipment.controller.ts / fault.controller.ts / plan.controller.ts / record.controller.ts / stats.controller.ts | equipment.service.ts / fault.service.ts / plan.service.ts / record.service.ts / stats.service.ts | 10-equipment-and-measuring.md | 已覆盖 | 见 GAP-601 |
| exam.ts | exam.controller.ts | exam.service.ts | 11-training-internal-audit.md | 已覆盖 | — |
| export.ts | export.controller.ts | export.service.ts | 13-system-admin-ops.md | 已覆盖 | — |
| external-party.ts | external-party.controller.ts | external-party.service.ts | 04-supplier-procurement-incoming.md | 已覆盖 | — |
| file-preview.ts | document.controller.ts (预览) | file-preview.service.ts | 03-document-control-and-record-forms.md | 已覆盖 | — |
| food-safety-culture-record.ts | food-safety-culture-record.controller.ts | food-safety-culture-record.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| fragile-item-inspection.ts | fragile-item-inspection.controller.ts | fragile-item-inspection.service.ts | 07-quality-qc-release.md | 已覆盖 | 见 GAP-301 |
| health.ts | health.controller.ts | health.service.ts | 13-system-admin-ops.md | 基础设施 | — |
| import.ts | import.controller.ts | import.service.ts | 13-system-admin-ops.md | 已覆盖 | — |
| incoming-inspection.ts | incoming-inspection.controller.ts | incoming-inspection.service.ts | 04-supplier-procurement-incoming.md | 已覆盖 | 见 GAP-100 |
| line-change-check-record.ts | line-change-check-record.controller.ts | line-change-check-record.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| measuring-equipment.ts | measuring-equipment.controller.ts | measuring-equipment.service.ts | 10-equipment-and-measuring.md | 已覆盖 | 见 GAP-600/602 |
| medication-record.ts | medication-record.controller.ts | medication-record.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| metal-detection.ts | metal-detection.controller.ts | metal-detection.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| mixing.ts | mixing.controller.ts | mixing.service.ts | 06-mixing-production-packaging.md | 已覆盖 | — |
| monitoring.ts | monitoring.controller.ts | — | 13-system-admin-ops.md | 已覆盖 | 见 GAP-507/508/511 |
| new-record.ts | record.controller.ts | record.service.ts | 03-document-control-and-record-forms.md | 已覆盖 | 动态表单新记录 |
| non-conformance.ts | non-conformance.controller.ts | non-conformance.service.ts | 09-nonconformance-capa.md | 已覆盖 | 见 GAP-313/314/315 |
| packaging-material-usage.ts | packaging-material-usage.controller.ts | packaging-material-usage.service.ts | 06-mixing-production-packaging.md | 已覆盖 | 见 GAP-203 |
| permission.ts | permission.controller.ts / fine-grained-permission.controller.ts / department-permission.controller.ts | 各对应 service | 13-system-admin-ops.md | 已覆盖 | 见 GAP-506/512 |
| process-record.ts | process-record.controller.ts | process-record.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| process-step.ts | process-step.controller.ts | process-step.service.ts | 02-master-data-and-boundaries.md | 已覆盖 | 见 GAP-005 |
| process.ts | process-instance.controller.ts / process-template.controller.ts | — | 02-master-data-and-boundaries.md | 已覆盖 | 见 GAP-001/006 |
| product-process-change.ts | product-process-change.controller.ts | product-process-change.service.ts | 12-task-approval-workflow.md | 已覆盖 | — |
| product.ts | product.controller.ts | product.service.ts | 02-master-data-and-boundaries.md | 已覆盖 | — |
| production-run.ts | production-run.controller.ts | production-run.service.ts | 06-mixing-production-packaging.md | 已覆盖 | — |
| recipe.ts | recipe.controller.ts | recipe.service.ts | 02-master-data-and-boundaries.md | 已覆盖 | 见 GAP-008 |
| record-task.ts | record-task.controller.ts | record-task-*.service.ts | 12-task-approval-workflow.md | 已覆盖 | 见 GAP-504/505 |
| record-template.ts | record-template.controller.ts / template-alias.controller.ts | record-template.service.ts | 03-document-control-and-record-forms.md | 已覆盖 | 见 GAP-404 |
| record.ts | record.controller.ts | record.service.ts | 03-document-control-and-record-forms.md | 已覆盖 | — |
| recycle-bin.ts | recycle-bin.controller.ts | recycle-bin.service.ts | 13-system-admin-ops.md | 已覆盖 | — |
| rework-record.ts | rework-record.controller.ts | rework-record.service.ts | 09-nonconformance-capa.md | 已覆盖 | 见 GAP-318 |
| role.ts | role.controller.ts | role.service.ts | 13-system-admin-ops.md | 已覆盖 | — |
| search.ts | search.controller.ts | search.service.ts | 13-system-admin-ops.md | 已覆盖 | — |
| shift-instance.ts | shift-instance.controller.ts | shift-instance.service.ts | 06-mixing-production-packaging.md | 已覆盖 | 见 GAP-200/207 |
| sso.ts | sso.controller.ts | sso.service.ts | 13-system-admin-ops.md | 已覆盖 | SSO 登录 |
| statistics.ts | statistics.controller.ts | statistics.service.ts / management-dashboard.service.ts | 13-system-admin-ops.md | 已覆盖 | — |
| supplier-evaluation.ts | supplier-evaluation.controller.ts | supplier-evaluation.service.ts | 04-supplier-procurement-incoming.md | 已覆盖 | 见 GAP-105 |
| task.ts | task.controller.ts | task.service.ts | 12-task-approval-workflow.md | 已覆盖 | 见 GAP-504 |
| team-shift.ts | team-shift.controller.ts | team-shift.service.ts | 06-mixing-production-packaging.md | 已覆盖 | — |
| todo.ts | todo.controller.ts | — | 12-task-approval-workflow.md | 已覆盖 | — |
| traceability.ts | traceability.controller.ts / batch-trace/trace.controller.ts | traceability.service.ts + 4 子服务 | 08-traceability-complaint-recall.md | 已覆盖 | 见 GAP-306/307/308/312 |
| training.ts | training.controller.ts / archive.controller.ts / exam.controller.ts | 各对应 service | 11-training-internal-audit.md | 已覆盖 | 见 GAP-408/409 |
| unified-approval.ts | approval-definition.controller.ts / approval-instance.controller.ts / approval-task.controller.ts | approval-engine.service.ts | 12-task-approval-workflow.md | 已覆盖 | — |
| violation-record.ts | violation-record.controller.ts | violation-record.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| visitor-record.ts | visitor-record.controller.ts | visitor-record.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| warehouse.ts | warehouse/batch.controller.ts / inbound.controller.ts / material.controller.ts / requisition.controller.ts / staging-area.controller.ts / supplier.controller.ts / material-balance.controller.ts / traceability.controller.ts / controllers/*.controller.ts | 各对应 service | 05-warehouse-inventory.md | 已覆盖 | 见 GAP-101~110 |
| waste.ts | waste.controller.ts | waste.service.ts | 07-quality-qc-release.md | 已覆盖 | — |
| workflow.ts | workflow-template.controller.ts / workflow-instance.controller.ts / workflow-task.controller.ts / workflow-advanced.controller.ts | 各对应 service | 12-task-approval-workflow.md | 已覆盖 | 见 GAP-503 |
| workshop-area.ts | workshop-area.controller.ts | workshop-area.service.ts | 06-mixing-production-packaging.md | 已覆盖 | — |

**无匹配前端适配器的后端模块（纯后端能力）：**

| 后端模块/Controller | 说明 | 所属模块文档 |
|---|---|---|
| alert.controller.ts | 告警规则/历史，前端通过 monitoring.ts 访问 | 13-system-admin-ops.md |
| mobile.controller.ts / sync.controller.ts | 移动端专用，无前端 SPA 适配器 | 13-system-admin-ops.md |
| model-landing.controller.ts | 内部工具，无独立前端 API 文件 | 03-document-control-and-record-forms.md |
| operation-log.controller.ts | 前端通过 audit.ts 访问 | 13-system-admin-ops.md |
| permission-audit-log.controller.ts | 操作日志子路由，前端通过 audit.ts 访问 | 13-system-admin-ops.md |
| scheduled-task (service only) | 纯后端 Cron，无前端入口 | 13-system-admin-ops.md |
| workflow-triggers.controller.ts (service only) | 纯后端触发器，无前端入口 | 12-task-approval-workflow.md |
| upload.controller.ts | 通用上传，前端直接调用无独立 api 文件 | 13-system-admin-ops.md |
| system-config.controller.ts | 系统配置，前端无独立 api 适配器 | 13-system-admin-ops.md |
| user-permission.controller.ts | 前端通过 permission.ts 统一访问 | 13-system-admin-ops.md |
| notification.controller.ts | 前端无独立 api 适配器，通过内置路由访问 | 13-system-admin-ops.md |
| recycle-bin.controller.ts | recycle-bin.ts 覆盖 | 13-system-admin-ops.md |
| internal-audit/* controllers | 前端通过 internal-audit 目录内部分 API 调用，见 GAP-407 | 11-training-internal-audit.md |

---

## 5. 未覆盖或需判定对象

| 对象 | 类型 | 当前判断 | 处理方式 | 对应 GAP | 后续动作 |
|---|---|---|---|---|---|
| /warehouse/traceability | 前端路由 | 残留模块 | 旧追溯入口，无 component 声明；权威入口为 /traceability | GAP-312 | 在 GAP-312 清理旧追溯端点时一并移除 |
| /workflow-templates/designer | 前端路由 | 残留模块 | 与 /workflow/designer 重复注册，旧入口 | — | 移除重复路由，统一到 /workflow/designer |
| /recipes, /recipes/:id/edit, /process-steps | 前端路由 | 残留模块 | 静默重定向旧入口，见 GAP-004 | GAP-004 | 加 beforeEnter 提示后下线 |
| InventoryMovement | Prisma 模型 | 历史兼容 | 遗留模型，未被任何 service 调用；统一决策后废弃 | GAP-102 | 等 GAP-102 决策后迁移/删除 |
| DocumentRecommendation | Prisma 模型 | 投影（AI 推荐） | 功能性投影，不是主数据，归入文控支撑能力 | — | 无需整改，分类为投影 |
| FulltextIndex | Prisma 模型 | 系统能力（搜索索引） | 纯基础设施投影，归入 13 | — | 无需整改，分类为基础设施 |
| internal-audit API（GAP-407） | 前端 API | 路径双前缀 bug | 所有 `/api/v1/audit/...` 路径需改为 `/audit/...` | GAP-407 | 需修复后内审模块才可用 |
| training/archives API（GAP-408） | 前端 API | 路径拼写+双前缀 | `/api/v1/training/archives` 改为 `/training/archive` | GAP-408 | 需修复后培训档案才可用 |
| training project status endpoints（GAP-409） | 后端 Controller | 缺失端点 | `POST /:id/start|complete|cancel` 未实现 | GAP-409 | 补充后端端点 |
| backup available/status endpoints（GAP-509/510） | 后端 Controller | 缺失端点 | `GET /backup/available` 和 `GET /backup/:id/status` 未实现 | GAP-509, GAP-510 | 补充后端端点 |
| GET /auth/profile 方法不匹配（GAP-501） | 后端 Controller | P0 缺陷 | 后端 @Post 应改为 @Get | GAP-501 | 立即修复，所有需登录功能依赖此 |
| ProductRecall 召回 | Prisma 模型 | 缺失独立模型 | 当前走动态表单，无状态机；业务决策后建模 | GAP-311 | 等业务确认后建立独立模型 |
| ManagementReview 管理评审 | Prisma 模型 | 缺失独立模型 | 当前走动态表单；需汇总内审+培训统计 | GAP-414 | 等业务确认后建立独立模型 |
