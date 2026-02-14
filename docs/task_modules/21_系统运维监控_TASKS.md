# 系统运维监控 - Task 分解

> **来源**: docs/design/layer4_运维/17_系统运维监控.md
> **总工作量**: 320h
> **优先级**: P2（运维支撑）
> **依赖**: 无

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 2 | 24h |
| 后端 API | 6 | 128h |
| 前端 UI | 6 | 104h |
| 测试 | 4 | 48h |
| 集成与优化 | 2 | 16h |
| **总计** | **20** | **320h** |

---

## Phase 1: 数据模型（24h）

### TASK-359: 创建操作日志表（LoginLog, PermissionLog, SensitiveLog）

**类型**: 数据模型

**工作量**: 12h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
根据 17_系统运维监控.md 第 614-679 行设计，创建审计日志相关数据表，支持登录日志、权限变更日志、敏感操作日志记录。

**核心表清单**:
1. LoginLog - 登录日志
2. PermissionLog - 权限变更日志
3. SensitiveLog - 敏感操作日志

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] LoginLog 表包含字段（id, userId, username, action, ipAddress, userAgent, location, loginTime, logoutTime, status, failReason）
- [ ] PermissionLog 表包含字段（id, operatorId, operatorName, targetUserId, targetUsername, action, beforeValue, afterValue, reason, approvedBy, approvedByName, ipAddress, createdAt）
- [ ] SensitiveLog 表包含字段（id, userId, username, action, resourceType, resourceId, resourceName, details, ipAddress, userAgent, createdAt）
- [ ] action 字段枚举正确（LoginLog: login/logout/login_failed, PermissionLog: assign_role/revoke_role/change_department, SensitiveLog: delete_document/export_data/approve/reject）
- [ ] 索引配置正确（userId, loginTime, ipAddress, status, action, resourceType, createdAt）
- [ ] 外键约束配置正确（userId 引用 users(id)）
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-269: 登录日志保留 90 天，权限变更/敏感操作永久保留
- BR-270: 所有敏感操作必须记录审计日志

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_audit_logs/

**后续 Task**: TASK-361, TASK-362（操作日志 API 依赖此表）

---

### TASK-360: 创建系统监控指标表

**类型**: 数据模型

**工作量**: 12h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
创建系统监控指标数据表，记录应用性能指标、业务指标、告警规则等。

**核心表清单**:
1. SystemMetric - 系统性能指标记录
2. AlertRule - 告警规则配置
3. AlertHistory - 告警历史记录

**验收标准**:
- [ ] Prisma Schema 编写完成
- [ ] SystemMetric 表包含字段（id, metricName, metricValue, metricType, tags, timestamp, createdAt）
- [ ] AlertRule 表包含字段（id, name, metricName, condition, threshold, severity, enabled, notifyChannels, createdAt, updatedAt）
- [ ] AlertHistory 表包含字段（id, ruleId, metricValue, triggeredAt, resolvedAt, status, message, notifiedUsers, createdAt）
- [ ] metricType 字段枚举正确（system/application/business）
- [ ] severity 字段枚举正确（info/warning/critical）
- [ ] status 字段枚举正确（triggered/resolved/acknowledged）
- [ ] 索引配置正确（metricName, timestamp, ruleId, triggeredAt, status）
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-264: Prometheus 指标保留 30 天
- BR-266~BR-268: 告警规则配置

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_monitoring_tables/

**后续 Task**: TASK-363, TASK-364（监控数据采集 API 依赖此表）

---

## Phase 2: 后端 API（128h）

### TASK-361: 实现操作日志记录 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-359

**描述**:
实现操作日志自动记录 API，支持登录日志、权限变更日志、敏感操作日志的自动记录。

**API 端点**:
- POST /api/v1/audit/login-logs - 记录登录日志（自动调用）
- POST /api/v1/audit/permission-logs - 记录权限变更日志（自动调用）
- POST /api/v1/audit/sensitive-logs - 记录敏感操作日志（拦截器自动调用）

**验收标准**:
- [ ] 支持记录登录日志（userId, username, action, ipAddress, userAgent, status）
- [ ] 支持记录权限变更日志（operatorId, targetUserId, action, beforeValue, afterValue, reason）
- [ ] 支持记录敏感操作日志（userId, action, resourceType, resourceId, details）
- [ ] 实现 SensitiveLog 装饰器（@SensitiveLog(action, resourceType)）
- [ ] 实现 SensitiveLogInterceptor 拦截器（自动记录敏感操作）
- [ ] 登录失败记录完整信息（failReason）
- [ ] 权限变更记录前后值对比（beforeValue, afterValue）
- [ ] 自动记录 IP 地址和 User-Agent
- [ ] 支持批量记录
- [ ] 异常处理（记录失败不影响主流程）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-269: 登录日志保留 90 天
- BR-270: 所有敏感操作必须记录审计日志

**技术要点**:
- 使用 NestJS Interceptor 自动记录敏感操作
- 使用装饰器标记敏感操作
- 记录失败时只打印日志，不抛出异常

**相关文件**:
- server/src/modules/audit/audit.controller.ts
- server/src/modules/audit/audit.service.ts
- server/src/modules/audit/decorators/sensitive-log.decorator.ts
- server/src/modules/audit/interceptors/sensitive-log.interceptor.ts
- server/src/modules/audit/dto/create-log.dto.ts
- server/test/audit.e2e-spec.ts

**后续 Task**: TASK-362（日志查询 API）

---

### TASK-362: 实现日志查询与分析 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-359, TASK-361

**描述**:
实现操作日志查询与分析 API，支持按用户、时间、操作类型查询日志，生成 BRCGS 审计报告。

**API 端点**:
- POST /api/v1/audit/login-logs/query - 查询登录日志
- GET /api/v1/audit/login-logs/export - 导出登录日志（Excel）
- GET /api/v1/audit/login-logs/stats - 登录统计
- POST /api/v1/audit/permission-logs/query - 查询权限变更日志
- GET /api/v1/audit/permission-logs/export - 导出权限变更日志
- GET /api/v1/audit/permission-logs/:userId - 查询某用户的权限变更历史
- POST /api/v1/audit/sensitive-logs/query - 查询敏感操作日志
- GET /api/v1/audit/sensitive-logs/export - 导出敏感操作日志
- GET /api/v1/audit/sensitive-logs/stats - 敏感操作统计
- POST /api/v1/audit/search - 跨日志类型搜索
- GET /api/v1/audit/dashboard - 审计仪表板统计
- GET /api/v1/audit/timeline/:userId - 用户操作时间线
- GET /api/v1/audit/brcgs-report - 生成 BRCGS 审计报告

**验收标准**:
- [ ] 支持查询登录日志（分页、筛选：用户、IP、状态、时间范围）
- [ ] 支持查询权限变更日志（分页、筛选：操作人、目标用户、操作类型、时间范围）
- [ ] 支持查询敏感操作日志（分页、筛选：用户、操作类型、资源类型、时间范围）
- [ ] 支持跨日志类型搜索（按用户名、IP、关键字）
- [ ] 支持导出日志（Excel 格式）
- [ ] 支持生成登录统计（登录次数、失败次数、失败率）
- [ ] 支持生成敏感操作统计（按操作类型、资源类型分组）
- [ ] 支持生成审计仪表板统计（今日登录、今日敏感操作、异常登录）
- [ ] 支持生成用户操作时间线（按时间倒序）
- [ ] 支持生成 BRCGS 审计报告（包含 3.5.2/3.5.3/3.5.4 合规项）
- [ ] 权限校验（只有管理员可查看所有日志）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-269: 登录日志保留 90 天，权限变更/敏感操作永久保留
- BRCGS 3.5.2: 记录修改历史
- BRCGS 3.5.3: 权限变更记录
- BRCGS 3.5.4: 登录日志记录

**相关文件**:
- server/src/modules/audit/audit.controller.ts
- server/src/modules/audit/audit.service.ts
- server/src/modules/audit/audit-report.service.ts
- server/src/modules/audit/dto/query-log.dto.ts
- server/test/audit.e2e-spec.ts

**后续 Task**: TASK-368（前端操作日志查询页面）

---

### TASK-363: 实现系统监控数据采集 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-360

**描述**:
实现系统监控数据采集 API，集成 Prometheus，暴露 /metrics 端点，记录业务指标。

**API 端点**:
- GET /metrics - Prometheus 指标采集端点
- POST /api/v1/monitoring/metrics - 记录业务指标（内部调用）
- GET /api/v1/monitoring/metrics/query - 查询历史指标

**验收标准**:
- [ ] 集成 @willsoto/nestjs-prometheus（启用默认指标）
- [ ] 暴露 /metrics 端点（Prometheus 格式）
- [ ] 实现业务指标记录（文档上传次数、审批耗时、在线用户数、登录失败次数）
- [ ] 实现自定义 Counter（doc_system_document_uploads_total）
- [ ] 实现自定义 Histogram（doc_system_approval_duration_seconds）
- [ ] 实现自定义 Gauge（doc_system_active_users）
- [ ] 实现自定义 Counter（doc_system_login_failures_total）
- [ ] 支持查询历史指标（按时间范围、指标名称）
- [ ] 支持指标聚合查询（按天/周/月统计）
- [ ] 指标自动清理（保留 30 天）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%

**业务规则**:
- BR-264: Prometheus 指标保留 30 天

**技术要点**:
- 使用 @willsoto/nestjs-prometheus 集成 Prometheus
- 使用 prom-client 定义自定义指标
- 在业务逻辑中调用 MetricsService 记录指标

**相关文件**:
- server/src/modules/monitoring/monitoring.controller.ts
- server/src/modules/monitoring/metrics.service.ts
- server/src/app.module.ts（注册 PrometheusModule）
- server/test/monitoring.e2e-spec.ts

**后续 Task**: TASK-364（性能监控与告警 API）

---

### TASK-364: 实现性能监控与告警 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-360, TASK-363

**描述**:
实现性能监控与告警 API，支持告警规则配置、告警触发、告警历史查询。

**API 端点**:
- POST /api/v1/monitoring/alerts/rules - 创建告警规则
- GET /api/v1/monitoring/alerts/rules - 查询告警规则列表
- PUT /api/v1/monitoring/alerts/rules/:id - 更新告警规则
- DELETE /api/v1/monitoring/alerts/rules/:id - 删除告警规则
- POST /api/v1/monitoring/alerts/rules/:id/toggle - 启用/禁用告警规则
- GET /api/v1/monitoring/alerts/history - 查询告警历史
- POST /api/v1/monitoring/alerts/history/:id/acknowledge - 确认告警

**验收标准**:
- [ ] 支持创建告警规则（name, metricName, condition, threshold, severity, notifyChannels）
- [ ] 支持查询告警规则列表（分页、筛选：enabled, severity）
- [ ] 支持更新告警规则（修改阈值、通知渠道）
- [ ] 支持删除告警规则
- [ ] 支持启用/禁用告警规则
- [ ] 支持查询告警历史（分页、筛选：ruleId, status, 时间范围）
- [ ] 支持确认告警（标记为 acknowledged）
- [ ] 告警规则条件校验（>, <, >=, <=, ==）
- [ ] 告警触发逻辑正确（满足条件时创建 AlertHistory）
- [ ] 告警恢复逻辑正确（不满足条件时更新 resolvedAt）
- [ ] 告警通知发送（邮件/企业微信/钉钉）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-266: API P99 响应时间 > 2秒 触发告警
- BR-267: HTTP 5xx 错误率 > 5% 触发告警
- BR-268: 登录失败次数 > 10次/分钟 触发告警

**相关文件**:
- server/src/modules/monitoring/alert.controller.ts
- server/src/modules/monitoring/alert.service.ts
- server/src/modules/monitoring/dto/create-alert-rule.dto.ts
- server/test/monitoring.e2e-spec.ts

**后续 Task**: TASK-370（前端告警规则配置页面）

---

### TASK-365: 实现数据备份 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: 无

**描述**:
实现数据备份 API，支持手动触发 PostgreSQL 和 MinIO 备份，查询备份历史。

**API 端点**:
- POST /api/v1/backup/postgres/trigger - 手动触发 PostgreSQL 备份
- POST /api/v1/backup/minio/trigger - 手动触发 MinIO 备份
- GET /api/v1/backup/history - 查询备份历史
- POST /api/v1/backup/restore - 恢复备份（仅查询可用备份，实际恢复需手动操作）
- DELETE /api/v1/backup/:id - 删除备份

**验收标准**:
- [ ] 支持手动触发 PostgreSQL 备份（调用 Docker exec pg_dump 命令）
- [ ] 支持手动触发 MinIO 备份（调用 Docker exec mc mirror 命令）
- [ ] 支持查询备份历史（分页、筛选：备份类型、状态、时间范围）
- [ ] 支持查询可用备份（用于恢复）
- [ ] 支持删除备份文件（只能删除 7 天以前的备份）
- [ ] 备份状态跟踪（running, success, failed）
- [ ] 备份文件大小记录
- [ ] 备份完成后发送通知
- [ ] 备份失败时记录错误信息
- [ ] 权限校验（只有管理员可操作）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-261: PostgreSQL 每天自动备份，保留 7 天
- BR-262: MinIO 文件每天自动备份，保留 7 天
- BR-263: 系统 RPO 目标 24 小时，RTO 目标 2 小时

**技术要点**:
- 使用 child_process.exec 调用 Docker 命令
- 备份文件命名规范：backup_YYYYMMDD_HHMMSS.dump
- 备份文件存储路径：backups/postgres/ 和 backups/minio/

**相关文件**:
- server/src/modules/backup/backup.controller.ts
- server/src/modules/backup/backup.service.ts
- server/src/modules/backup/dto/trigger-backup.dto.ts
- server/test/backup.e2e-spec.ts

**后续 Task**: TASK-371（前端数据备份管理页面）

---

### TASK-366: 实现系统健康检查 API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P1

**依赖**: 无

**描述**:
实现系统健康检查 API，支持检查数据库、Redis、MinIO、磁盘空间等服务状态。

**API 端点**:
- GET /api/v1/health - 综合健康检查
- GET /api/v1/health/postgres - PostgreSQL 健康检查
- GET /api/v1/health/redis - Redis 健康检查
- GET /api/v1/health/minio - MinIO 健康检查
- GET /api/v1/health/disk - 磁盘空间检查
- GET /api/v1/health/dependencies - 所有依赖服务状态

**验收标准**:
- [ ] 支持综合健康检查（返回所有服务状态）
- [ ] 支持 PostgreSQL 健康检查（连接测试、查询测试）
- [ ] 支持 Redis 健康检查（ping 测试）
- [ ] 支持 MinIO 健康检查（listBuckets 测试）
- [ ] 支持磁盘空间检查（可用空间、使用率）
- [ ] 支持所有依赖服务状态查询
- [ ] 健康检查响应时间 < 3 秒
- [ ] 健康检查结果包含详细信息（状态、延迟、错误信息）
- [ ] 健康检查结果符合标准格式（status: healthy/degraded/unhealthy）
- [ ] 异常处理（服务不可用时返回 degraded 状态）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**响应格式**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-14T10:00:00Z",
  "services": {
    "postgres": { "status": "healthy", "latency": 5 },
    "redis": { "status": "healthy", "latency": 2 },
    "minio": { "status": "healthy", "latency": 10 },
    "disk": { "status": "healthy", "available": "50GB", "usage": 60 }
  }
}
```

**相关文件**:
- server/src/modules/health/health.controller.ts
- server/src/modules/health/health.service.ts
- server/test/health.e2e-spec.ts

**后续 Task**: TASK-372（前端系统健康检查页面）

---

## Phase 3: 前端 UI（104h）

### TASK-367: 实现运维监控大屏

**类型**: 前端 UI

**工作量**: 20h

**优先级**: P1

**依赖**: TASK-362, TASK-363, TASK-366

**描述**:
实现运维监控大屏，实时展示系统状态、性能指标、告警信息、操作日志统计。

**页面路由**:
- /monitoring/dashboard - 运维监控大屏

**功能要求**:
- 系统健康状态展示（数据库、Redis、MinIO、磁盘）
- 实时性能指标展示（CPU、内存、磁盘 I/O、网络）
- 业务指标展示（今日文档上传、今日审批、在线用户数）
- 告警信息实时展示（未确认告警、最近告警历史）
- 操作日志统计（今日登录、今日敏感操作、异常登录）
- 自动刷新（每 30 秒刷新一次）

**验收标准**:
- [ ] 页面布局符合设计稿（大屏风格）
- [ ] 系统健康状态展示正确（绿色=健康，黄色=降级，红色=不健康）
- [ ] 实时性能指标图表展示（使用 ECharts）
- [ ] 业务指标卡片展示（数字 + 趋势图）
- [ ] 告警信息列表展示（按严重程度排序）
- [ ] 操作日志统计图表展示（饼图/柱状图）
- [ ] 自动刷新功能正常（可手动暂停/恢复）
- [ ] 支持全屏显示
- [ ] 响应式布局（适配大屏、PC）
- [ ] 异常处理

**主要组件**:
- MonitoringDashboard.vue - 运维监控大屏主页面
- HealthStatusCard.vue - 健康状态卡片组件
- MetricsChart.vue - 性能指标图表组件
- AlertList.vue - 告警列表组件
- LogStatsChart.vue - 日志统计图表组件

**相关文件**:
- client/src/views/monitoring/Dashboard.vue
- client/src/components/HealthStatusCard.vue
- client/src/components/MetricsChart.vue

**后续 Task**: 无

---

### TASK-368: 实现操作日志查询页面

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-362

**描述**:
实现操作日志查询页面，支持查询登录日志、权限变更日志、敏感操作日志，导出日志。

**页面路由**:
- /audit/login-logs - 登录日志查询
- /audit/permission-logs - 权限变更日志查询
- /audit/sensitive-logs - 敏感操作日志查询
- /audit/search - 综合日志搜索

**功能要求**:
- 登录日志查询（筛选：用户、IP、状态、时间范围）
- 权限变更日志查询（筛选：操作人、目标用户、操作类型、时间范围）
- 敏感操作日志查询（筛选：用户、操作类型、资源类型、时间范围）
- 综合日志搜索（按关键字搜索）
- 导出日志（Excel 格式）
- 查看日志详情（详细信息弹窗）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 登录日志列表展示（用户、IP、状态、登录时间、登出时间）
- [ ] 权限变更日志列表展示（操作人、目标用户、操作类型、前后值对比、时间）
- [ ] 敏感操作日志列表展示（用户、操作类型、资源类型、资源名称、时间）
- [ ] 筛选功能正常（用户选择器、时间范围选择器、状态选择器）
- [ ] 导出功能正常（调用 /api/v1/audit/*/export）
- [ ] 日志详情弹窗展示完整信息
- [ ] 分页功能正常
- [ ] 权限校验（只有管理员可查看）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- LoginLogList.vue - 登录日志列表组件
- PermissionLogList.vue - 权限变更日志列表组件
- SensitiveLogList.vue - 敏感操作日志列表组件
- LogDetailDialog.vue - 日志详情弹窗组件

**相关文件**:
- client/src/views/audit/LoginLogList.vue
- client/src/views/audit/PermissionLogList.vue
- client/src/views/audit/SensitiveLogList.vue
- client/src/components/LogDetailDialog.vue

**后续 Task**: 无

---

### TASK-369: 实现性能监控图表页面

**类型**: 前端 UI

**工作量**: 20h

**优先级**: P1

**依赖**: TASK-363

**描述**:
实现性能监控图表页面，展示系统指标、应用指标、业务指标的历史趋势。

**页面路由**:
- /monitoring/metrics - 性能监控图表

**功能要求**:
- 系统指标图表（CPU、内存、磁盘 I/O、网络）
- 应用指标图表（HTTP 请求数、响应时间、错误率）
- 业务指标图表（文档上传趋势、审批耗时趋势、在线用户趋势）
- 时间范围选择（最近 1 小时、6 小时、24 小时、7 天、30 天）
- 指标对比（多个指标在同一图表）
- 数据聚合（按分钟/小时/天聚合）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 系统指标图表展示正确（折线图，使用 ECharts）
- [ ] 应用指标图表展示正确（柱状图/折线图）
- [ ] 业务指标图表展示正确（面积图/折线图）
- [ ] 时间范围选择功能正常（快捷选择 + 自定义范围）
- [ ] 指标对比功能正常（多选指标）
- [ ] 数据聚合功能正常（自动根据时间范围选择聚合粒度）
- [ ] 图表交互流畅（缩放、拖拽、数据点提示）
- [ ] 支持导出图表（PNG 格式）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- MetricsPage.vue - 性能监控图表主页面
- MetricLineChart.vue - 指标折线图组件
- MetricSelector.vue - 指标选择器组件
- TimeRangePicker.vue - 时间范围选择器组件

**相关文件**:
- client/src/views/monitoring/MetricsPage.vue
- client/src/components/MetricLineChart.vue
- client/src/components/MetricSelector.vue

**后续 Task**: 无

---

### TASK-370: 实现告警规则配置页面

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-364

**描述**:
实现告警规则配置页面，支持创建、编辑、删除告警规则，查看告警历史。

**页面路由**:
- /monitoring/alerts/rules - 告警规则列表
- /monitoring/alerts/history - 告警历史

**功能要求**:
- 告警规则列表展示（名称、指标、条件、阈值、严重程度、启用状态）
- 创建告警规则（指标选择、条件配置、阈值设置、通知渠道）
- 编辑告警规则
- 删除告警规则
- 启用/禁用告警规则
- 告警历史列表展示（规则名称、触发值、触发时间、恢复时间、状态）
- 确认告警

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 告警规则列表展示正确
- [ ] 创建告警规则功能正常（调用 POST /api/v1/monitoring/alerts/rules）
- [ ] 编辑告警规则功能正常（调用 PUT /api/v1/monitoring/alerts/rules/:id）
- [ ] 删除告警规则功能正常（调用 DELETE /api/v1/monitoring/alerts/rules/:id）
- [ ] 启用/禁用告警规则功能正常（调用 POST /api/v1/monitoring/alerts/rules/:id/toggle）
- [ ] 告警历史列表展示正确（按时间倒序）
- [ ] 确认告警功能正常（调用 POST /api/v1/monitoring/alerts/history/:id/acknowledge）
- [ ] 指标选择器（下拉选择可用指标）
- [ ] 条件选择器（>, <, >=, <=, ==）
- [ ] 通知渠道选择器（邮件、企业微信、钉钉）
- [ ] 权限校验（只有管理员可配置）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- AlertRuleList.vue - 告警规则列表组件
- AlertRuleForm.vue - 告警规则表单组件
- AlertHistoryList.vue - 告警历史列表组件

**相关文件**:
- client/src/views/monitoring/AlertRuleList.vue
- client/src/views/monitoring/AlertRuleForm.vue
- client/src/views/monitoring/AlertHistoryList.vue

**后续 Task**: 无

---

### TASK-371: 实现数据备份管理页面

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-365

**描述**:
实现数据备份管理页面，支持手动触发备份、查看备份历史、删除备份。

**页面路由**:
- /backup/manage - 数据备份管理

**功能要求**:
- 手动触发 PostgreSQL 备份
- 手动触发 MinIO 备份
- 备份历史列表展示（备份类型、文件大小、状态、创建时间）
- 删除备份文件
- 查看备份详情
- 备份任务进度展示

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 手动触发 PostgreSQL 备份功能正常（调用 POST /api/v1/backup/postgres/trigger）
- [ ] 手动触发 MinIO 备份功能正常（调用 POST /api/v1/backup/minio/trigger）
- [ ] 备份历史列表展示正确（分页、筛选：备份类型、状态）
- [ ] 删除备份功能正常（调用 DELETE /api/v1/backup/:id）
- [ ] 备份详情查看功能正常
- [ ] 备份任务进度展示（running 状态显示进度条）
- [ ] 备份状态显示正确（success=绿色，failed=红色，running=蓝色）
- [ ] 文件大小格式化显示（MB/GB）
- [ ] 权限校验（只有管理员可操作）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- BackupManage.vue - 数据备份管理主页面
- BackupHistoryTable.vue - 备份历史表格组件
- BackupTriggerButton.vue - 备份触发按钮组件

**相关文件**:
- client/src/views/backup/BackupManage.vue
- client/src/components/BackupHistoryTable.vue

**后续 Task**: 无

---

### TASK-372: 实现系统健康检查页面

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-366

**描述**:
实现系统健康检查页面，展示所有依赖服务的健康状态和详细信息。

**页面路由**:
- /health - 系统健康检查

**功能要求**:
- 综合健康状态展示（健康/降级/不健康）
- PostgreSQL 健康状态（连接状态、延迟、数据库大小）
- Redis 健康状态（连接状态、延迟、内存使用）
- MinIO 健康状态（连接状态、延迟、存储桶列表）
- 磁盘空间状态（可用空间、使用率、告警阈值）
- 手动刷新健康检查
- 自动刷新（每 1 分钟）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 综合健康状态展示正确（调用 GET /api/v1/health）
- [ ] PostgreSQL 健康状态卡片展示正确
- [ ] Redis 健康状态卡片展示正确
- [ ] MinIO 健康状态卡片展示正确
- [ ] 磁盘空间状态卡片展示正确（进度条 + 百分比）
- [ ] 手动刷新功能正常（点击刷新按钮）
- [ ] 自动刷新功能正常（每 1 分钟自动刷新）
- [ ] 健康状态图标显示正确（绿色=健康，黄色=降级，红色=不健康）
- [ ] 延迟时间格式化显示（ms）
- [ ] 异常处理（服务不可用时显示错误信息）
- [ ] 响应式布局

**主要组件**:
- HealthPage.vue - 系统健康检查主页面
- ServiceHealthCard.vue - 服务健康状态卡片组件
- DiskUsageCard.vue - 磁盘使用情况卡片组件

**相关文件**:
- client/src/views/health/HealthPage.vue
- client/src/components/ServiceHealthCard.vue
- client/src/components/DiskUsageCard.vue

**后续 Task**: 无

---

## Phase 4: 测试（48h）

### TASK-373: 编写运维管理单元测试

**类型**: 测试

**工作量**: 12h

**优先级**: P1

**依赖**: TASK-361~366

**描述**:
编写运维管理模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 操作日志记录逻辑
- 日志查询与分析逻辑
- 监控数据采集逻辑
- 告警规则配置逻辑
- 数据备份触发逻辑
- 系统健康检查逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有核心业务规则有对应测试用例（BR-261~BR-272）
- [ ] Mock 外部依赖（Prisma、Redis、MinIO、child_process）
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/audit.service.spec.ts
- server/test/metrics.service.spec.ts
- server/test/alert.service.spec.ts
- server/test/backup.service.spec.ts
- server/test/health.service.spec.ts

**后续 Task**: 无

---

### TASK-374: 编写运维管理集成测试

**类型**: 测试

**工作量**: 12h

**优先级**: P1

**依赖**: TASK-361~366

**描述**:
编写运维管理模块的集成测试，验证 API 端点。

**测试范围**:
- POST /api/v1/audit/login-logs
- POST /api/v1/audit/login-logs/query
- GET /api/v1/audit/brcgs-report
- GET /metrics
- POST /api/v1/monitoring/alerts/rules
- POST /api/v1/backup/postgres/trigger
- GET /api/v1/health

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 测试覆盖业务规则校验
- [ ] 所有测试通过

**相关文件**:
- server/test/audit.e2e-spec.ts
- server/test/monitoring.e2e-spec.ts
- server/test/backup.e2e-spec.ts
- server/test/health.e2e-spec.ts

**后续 Task**: 无

---

### TASK-375: 编写运维管理 E2E 测试

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-367~372

**描述**:
编写运维管理模块的 E2E 测试，验证关键用户流程。

**测试场景**:
1. 管理员登录 → 查看运维监控大屏 → 查看系统健康状态 → 查看性能指标
2. 管理员查询操作日志 → 筛选登录日志 → 导出日志 → 查看日志详情
3. 管理员配置告警规则 → 启用告警 → 触发告警 → 查看告警历史 → 确认告警
4. 管理员手动触发备份 → 查看备份历史 → 删除旧备份
5. 管理员查看系统健康检查 → 发现服务降级 → 查看详细信息

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过

**相关文件**:
- client/e2e/monitoring.spec.ts
- client/e2e/audit.spec.ts
- client/e2e/backup.spec.ts

**后续 Task**: 无

---

### TASK-376: 编写性能监控压力测试

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-363

**描述**:
编写性能监控压力测试，验证高并发场景下的监控数据采集性能。

**测试场景**:
1. 并发 100 个请求，验证 /metrics 端点响应时间 < 1s
2. 并发记录 1000 条业务指标，验证性能
3. 模拟高频日志记录，验证日志记录不影响主流程

**验收标准**:
- [ ] /metrics 端点并发 100 请求响应时间 < 1s
- [ ] 业务指标记录 QPS > 500
- [ ] 日志记录失败不影响主流程
- [ ] 所有测试通过

**相关文件**:
- server/test/monitoring.load.spec.ts

**后续 Task**: 无

---

## Phase 5: 集成与优化（16h）

### TASK-377: 实现定时任务（日志清理、监控采集）

**类型**: 集成

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-359, TASK-360

**描述**:
实现定时任务，支持日志自动清理、备份自动触发、告警检查。

**定时任务清单**:
1. 日志清理任务（每天凌晨 4:00）
   - 清理 90 天前的登录日志
   - 清理 30 天前的操作日志
   - 归档权限变更日志和敏感操作日志到 MinIO

2. 备份任务（每天凌晨 2:00）
   - 自动触发 PostgreSQL 备份
   - 自动触发 MinIO 备份
   - 删除 7 天前的备份

3. 告警检查任务（每分钟）
   - 检查所有启用的告警规则
   - 触发告警时创建 AlertHistory
   - 发送告警通知

**验收标准**:
- [ ] 定时任务正常运行（使用 @nestjs/schedule）
- [ ] 日志清理任务正常执行
- [ ] 日志归档任务正常执行（上传到 MinIO audit-archive 桶）
- [ ] 备份任务正常触发
- [ ] 告警检查任务正常运行
- [ ] 定时任务日志记录完整
- [ ] 异常处理（任务失败时记录错误但不中断）
- [ ] 单元测试覆盖率 ≥ 80%

**业务规则**:
- BR-269: 登录日志保留 90 天，权限变更/敏感操作永久保留
- BR-272: 审计日志归档到 MinIO audit-archive 桶
- BR-261~BR-262: 自动备份

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- 使用 Cron 表达式配置执行时间
- 记录定时任务执行日志

**相关文件**:
- server/src/modules/audit/audit.schedule.ts
- server/src/modules/backup/backup.schedule.ts
- server/src/modules/monitoring/alert.schedule.ts

**后续 Task**: 无

---

### TASK-378: 集成 Prometheus + Grafana + Loki（Docker Compose）

**类型**: 集成

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-363

**描述**:
集成 Prometheus + Grafana + Loki，完成监控栈部署，配置 Grafana 仪表板。

**集成要点**:
- 配置 docker-compose.yml（添加 Prometheus, Grafana, Loki, Promtail）
- 配置 Prometheus 采集规则（抓取 /metrics 端点）
- 配置 Grafana 数据源（Prometheus, Loki）
- 导入 Grafana 仪表板（系统仪表板、应用仪表板、业务仪表板）
- 配置 Alertmanager 告警通知

**验收标准**:
- [ ] docker-compose.yml 配置完成
- [ ] Prometheus 正常抓取 /metrics 端点
- [ ] Grafana 可访问（端口 3001）
- [ ] Grafana 数据源配置正确（Prometheus, Loki）
- [ ] Grafana 系统仪表板正常展示（CPU、内存、磁盘、网络）
- [ ] Grafana 应用仪表板正常展示（HTTP 请求、响应时间、错误率）
- [ ] Grafana 业务仪表板正常展示（文档上传、审批耗时、在线用户）
- [ ] Loki 正常采集 Docker 日志
- [ ] Alertmanager 告警通知正常发送（邮件/企业微信）
- [ ] 所有服务正常启动

**技术要点**:
- Prometheus 配置文件：monitoring/prometheus/prometheus.yml
- Grafana 仪表板 JSON：monitoring/grafana/dashboards/
- 告警规则配置：monitoring/alerts/

**相关文件**:
- docker-compose.yml
- monitoring/prometheus/prometheus.yml
- monitoring/grafana/provisioning/datasources/datasource.yml
- monitoring/grafana/dashboards/system.json
- monitoring/grafana/dashboards/application.json
- monitoring/grafana/dashboards/business.json
- monitoring/alerts/app-alerts.yml

**后续 Task**: 无

---

**本文档完成 ✅**（共 20 个 TASK，TASK-359 ~ TASK-378）
