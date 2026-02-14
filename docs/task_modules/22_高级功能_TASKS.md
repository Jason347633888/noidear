# 高级功能 - Task 分解

> **来源**: docs/design/advanced/18_高级功能.md
> **总工作量**: 480h
> **优先级**: P2（高级扩展）
> **依赖**: 动态表单引擎、批次追溯系统

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 3 | 40h |
| 后端 API | 8 | 176h |
| 前端 UI | 7 | 152h |
| 测试 | 4 | 80h |
| 集成与优化 | 2 | 32h |
| **总计** | **24** | **480h** |

---

## Phase 1: 数据模型（40h）

### TASK-379: 创建智能文档推荐表（DocumentRecommendation）

**类型**: 数据模型

**工作量**: 16h

**优先级**: P1

**依赖**: 无

**描述**:
根据 18_高级功能.md 设计，创建智能文档推荐表，记录用户文档访问历史和推荐结果。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] DocumentViewLog 表包含字段（id, userId, documentId, viewedAt, duration, createdAt）
- [ ] DocumentRecommendation 表包含字段（id, userId, documentId, score, reason, createdAt）
- [ ] 外键约束配置正确（userId 引用 users(id), documentId 引用 documents(id)）
- [ ] 索引配置正确（userId+viewedAt, userId+score DESC）
- [ ] 数据库迁移文件生成

**技术要点**:
- DocumentViewLog 记录用户查看文档的行为数据
- DocumentRecommendation 存储协同过滤算法生成的推荐结果
- score 字段范围 0-100，表示推荐权重

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_document_recommendation/

**后续 Task**: TASK-383（智能文档推荐 API 依赖此表）

---

### TASK-380: 创建全文搜索索引表（FulltextIndex）

**类型**: 数据模型

**工作量**: 12h

**优先级**: P1

**依赖**: 无

**描述**:
创建全文搜索索引表，存储文档全文索引数据，支持 ElasticSearch 集成。

**验收标准**:
- [ ] Prisma Schema 编写完成
- [ ] FulltextIndex 表包含字段（id, documentId, content, metadata, indexedAt, createdAt, updatedAt）
- [ ] 外键约束配置正确（documentId 引用 documents(id)）
- [ ] 唯一索引配置正确（documentId @unique）
- [ ] metadata 字段存储 JSON（文档类型、部门、标签等）
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-317: 文档搜索支持全文搜索和高亮关键词
- BR-318: 文档标签支持分类搜索

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_fulltext_index/

**后续 Task**: TASK-382（全文搜索 API 依赖此表）

---

### TASK-381: 创建工作流引擎表（WorkflowEngine）

**类型**: 数据模型

**工作量**: 12h

**优先级**: P1

**依赖**: 无

**描述**:
创建高级工作流引擎表，支持条件分支、审批委托、审批抄送功能。

**验收标准**:
- [ ] Prisma Schema 编写完成
- [ ] WorkflowStep 表新增 condition 字段（JSON，存储条件表达式）
- [ ] WorkflowStep 表新增 ccUsers 字段（String[]，抄送人列表）
- [ ] WorkflowTask 表新增 delegatedTo 字段（String，委托人 ID）
- [ ] DelegationLog 表包含字段（id, taskId, fromUserId, toUserId, reason, delegatedAt, createdAt）
- [ ] 外键约束配置正确
- [ ] 索引配置正确（taskId, delegatedAt）
- [ ] 数据库迁移文件生成

**业务规则**:
- BR-329: 工作流设计器支持可视化拖拽
- BR-334: 并行网关支持会签/或签
- BR-335: 排他网关支持条件分支
- BR-340: 流程转办支持委托

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_workflow_engine/

**后续 Task**: TASK-385（高级工作流引擎 API 依赖此表）

---

## Phase 2: 后端 API（176h）

### TASK-382: 实现全文搜索 API（ElasticSearch 集成）

**类型**: 后端 API

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-380

**描述**:
实现文档全文搜索 API，集成 ElasticSearch，支持 PDF/Word 文档全文索引和搜索。

**API 端点**:
- POST /api/v1/search/index/:documentId - 索引文档内容
- GET /api/v1/search/query - 全文搜索
- DELETE /api/v1/search/index/:documentId - 删除索引

**验收标准**:
- [ ] 支持 PDF 文本提取（pdf.js 库）
- [ ] 支持 Word 文本提取（mammoth.js 库）
- [ ] ElasticSearch 索引创建（mapping 配置）
- [ ] 全文搜索功能正常（keyword, filters）
- [ ] 搜索结果高亮显示（highlight 配置）
- [ ] 支持按文档类型、部门、标签筛选
- [ ] 支持分页、排序（相关度、时间）
- [ ] 权限校验（只能搜索有权限的文档）
- [ ] 异常处理（ES 连接失败、文本提取失败）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-317: 文档搜索支持全文搜索和高亮关键词

**技术要点**:
- ElasticSearch 连接配置（@nestjs/elasticsearch）
- PDF 文本提取（pdf-parse 或 pdf.js）
- Word 文本提取（mammoth.js）
- 中文分词（ik_max_word 分词器）

**相关文件**:
- server/src/modules/search/search.controller.ts
- server/src/modules/search/search.service.ts
- server/src/modules/search/elasticsearch.config.ts
- server/test/search.e2e-spec.ts

**后续 Task**: TASK-390（前端高级搜索页面）

---

### TASK-383: 实现智能文档推荐 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-379

**描述**:
实现智能文档推荐 API，基于协同过滤算法推荐相关文档。

**API 端点**:
- POST /api/v1/recommendations/track - 记录用户访问行为
- GET /api/v1/recommendations/my - 获取我的推荐文档
- POST /api/v1/recommendations/generate - 批量生成推荐（定时任务）

**验收标准**:
- [ ] 支持记录用户访问行为（documentId, duration）
- [ ] 支持获取推荐文档列表（按 score 排序）
- [ ] 协同过滤算法实现（基于用户-文档矩阵）
- [ ] 推荐理由生成（"查看此文档的用户还查看了..."）
- [ ] 推荐结果缓存（Redis，1 小时过期）
- [ ] 支持批量生成推荐（定时任务，每小时执行）
- [ ] 权限校验（只推荐有权限的文档）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-320: 最近访问记录用户最近访问的文档
- BR-321: 文档统计显示文档阅读量

**技术要点**:
- 协同过滤算法（User-Based CF）
- 相似度计算（余弦相似度）
- Redis 缓存推荐结果

**相关文件**:
- server/src/modules/recommendation/recommendation.controller.ts
- server/src/modules/recommendation/recommendation.service.ts
- server/src/modules/recommendation/collaborative-filter.ts
- server/test/recommendation.e2e-spec.ts

**后续 Task**: TASK-391（前端智能文档推荐组件）

---

### TASK-384: 实现批量操作 API（导出/导入）

**类型**: 后端 API

**工作量**: 24h

**优先级**: P1

**依赖**: 无

**描述**:
实现批量操作 API，支持文档、用户、设备等数据的批量导出和导入。

**API 端点**:
- POST /api/v1/export/documents - 批量导出文档元数据（Excel）
- POST /api/v1/export/users - 批量导出用户数据（Excel）
- POST /api/v1/import/documents - 批量导入文档元数据（Excel）
- POST /api/v1/import/users - 批量导入用户数据（Excel）

**验收标准**:
- [ ] 支持批量导出文档元数据（编号、标题、类型、状态等）
- [ ] 支持批量导出用户数据（用户名、姓名、部门、角色等）
- [ ] 支持批量导入文档元数据（Excel 解析 + 校验）
- [ ] 支持批量导入用户数据（Excel 解析 + 校验）
- [ ] Excel 模板下载功能（提供标准模板）
- [ ] 导入数据校验（必填字段、格式校验、重复校验）
- [ ] 导入失败详情返回（行号 + 错误信息）
- [ ] 导出数据分页处理（最大 10000 条/次）
- [ ] 权限校验（管理员权限）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**技术要点**:
- Excel 导出（xlsx 库，SheetJS）
- Excel 导入（xlsx 库，数据校验）
- 流式处理大数据量（Stream API）

**相关文件**:
- server/src/modules/export/export.controller.ts
- server/src/modules/export/export.service.ts
- server/src/modules/import/import.controller.ts
- server/src/modules/import/import.service.ts
- server/test/export.e2e-spec.ts

**后续 Task**: TASK-392（前端批量导出/导入功能）

---

### TASK-385: 实现高级工作流引擎 API

**类型**: 后端 API

**工作量**: 32h

**优先级**: P1

**依赖**: TASK-381

**描述**:
实现高级工作流引擎 API，支持条件分支、审批委托、审批抄送、审批回退。

**API 端点**:
- POST /api/v1/workflow/templates - 创建工作流模板（支持条件分支）
- POST /api/v1/workflow/tasks/:id/delegate - 委托审批任务
- POST /api/v1/workflow/tasks/:id/rollback - 回退审批任务
- POST /api/v1/workflow/tasks/:id/transfer - 转办审批任务
- GET /api/v1/workflow/delegation-logs - 查询委托日志

**验收标准**:
- [ ] 支持条件分支配置（condition: "amount > 10000"）
- [ ] 支持条件表达式解析（字段值比较：>, <, ==, !=）
- [ ] 支持审批委托（委托后原审批人可查看进度）
- [ ] 支持审批抄送（自动发送抄送通知）
- [ ] 支持审批回退（回退到上一步/任意步）
- [ ] 支持审批转办（转办后通知新审批人）
- [ ] 条件分支动态计算下一步审批人
- [ ] 委托日志记录完整（fromUserId, toUserId, reason）
- [ ] 权限校验（只有当前审批人可委托/转办）
- [ ] 异常处理（条件表达式错误、循环回退）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-334: 并行网关支持会签/或签
- BR-335: 排他网关支持条件分支（IF-ELSE）
- BR-339: 流程回退支持回退到上一步/任意步
- BR-340: 流程转办可转办给其他人

**技术要点**:
- 条件表达式解析器（简单表达式引擎）
- 工作流状态机（状态流转逻辑）
- 通知系统集成（委托/转办/抄送通知）

**相关文件**:
- server/src/modules/workflow/workflow.controller.ts
- server/src/modules/workflow/workflow.service.ts
- server/src/modules/workflow/condition-parser.ts
- server/test/workflow.e2e-spec.ts

**后续 Task**: TASK-393（前端可视化工作流设计器）

---

### TASK-386: 实现多语言支持 API（i18n）

**类型**: 后端 API

**工作量**: 24h

**优先级**: P2

**依赖**: 无

**描述**:
实现多语言支持 API，支持中文、英文界面切换。

**API 端点**:
- GET /api/v1/i18n/translations/:locale - 获取翻译文件（zh-CN, en-US）
- POST /api/v1/i18n/translations - 更新翻译文件（管理员）

**验收标准**:
- [ ] 支持中文（zh-CN）和英文（en-US）
- [ ] 翻译文件 JSON 格式存储（i18n/zh-CN.json, i18n/en-US.json）
- [ ] 支持获取翻译文件（按 locale 筛选）
- [ ] 支持更新翻译文件（管理员权限）
- [ ] 翻译键值对覆盖所有前端文本
- [ ] 接口错误信息支持多语言
- [ ] 翻译文件缓存（Redis，1 小时过期）
- [ ] 权限校验（管理员可更新）
- [ ] 异常处理（locale 不存在）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**技术要点**:
- nestjs-i18n 库集成
- 翻译文件 JSON 格式
- 前后端语言切换联动

**相关文件**:
- server/src/modules/i18n/i18n.controller.ts
- server/src/modules/i18n/i18n.service.ts
- server/i18n/zh-CN.json
- server/i18n/en-US.json
- server/test/i18n.e2e-spec.ts

**后续 Task**: TASK-394（前端多语言切换功能）

---

### TASK-387: 实现数据统计分析 API

**类型**: 后端 API

**工作量**: 24h

**优先级**: P2

**依赖**: 无

**描述**:
实现数据统计分析 API，支持文档统计、用户统计、审批统计、设备统计。

**API 端点**:
- GET /api/v1/statistics/documents - 文档统计（按类型、部门、状态分组）
- GET /api/v1/statistics/users - 用户统计（按部门、角色分组）
- GET /api/v1/statistics/workflow - 审批统计（平均耗时、超时率）
- GET /api/v1/statistics/equipment - 设备统计（完好率、维修率）

**验收标准**:
- [ ] 支持文档统计（总数、按类型/部门/状态分组）
- [ ] 支持用户统计（总数、按部门/角色分组）
- [ ] 支持审批统计（平均耗时、超时率、通过率）
- [ ] 支持设备统计（完好率、维修率、故障率）
- [ ] 支持时间范围筛选（本日/本周/本月/自定义）
- [ ] 统计结果缓存（Redis，15 分钟过期）
- [ ] 返回数据包含图表数据（饼图、柱状图、折线图）
- [ ] 权限校验（管理员可查看所有统计）
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-321: 文档统计显示文档阅读量、编辑次数
- BR-344: 流程统计包含平均耗时、超时率

**技术要点**:
- 复杂 SQL 聚合查询（GROUP BY, COUNT, AVG）
- Prisma 聚合函数（aggregate, groupBy）
- Redis 缓存统计结果

**相关文件**:
- server/src/modules/statistics/statistics.controller.ts
- server/src/modules/statistics/statistics.service.ts
- server/test/statistics.e2e-spec.ts

**后续 Task**: TASK-395（前端数据分析大屏）

---

### TASK-388: 实现 API 网关与限流

**类型**: 后端 API

**工作量**: 12h

**优先级**: P2

**依赖**: 无

**描述**:
实现 API 网关和限流功能，防止恶意请求和 DDoS 攻击。

**功能要点**:
- 全局限流（100 请求/分钟/IP）
- 用户级限流（1000 请求/分钟/用户）
- 接口级限流（特定接口 10 请求/分钟）
- 限流策略配置（Redis 计数器）
- 限流响应（429 Too Many Requests）

**验收标准**:
- [ ] 全局限流配置正确（@nestjs/throttler）
- [ ] 用户级限流配置正确（基于 JWT userId）
- [ ] 接口级限流配置正确（装饰器 @Throttle）
- [ ] Redis 存储限流计数器
- [ ] 限流响应正确（429 状态码 + 提示信息）
- [ ] 限流日志记录（记录被限流的 IP/用户）
- [ ] 白名单配置（管理员 IP 不限流）
- [ ] 异常处理（Redis 连接失败）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**技术要点**:
- @nestjs/throttler 限流模块
- Redis 计数器（INCR + EXPIRE）
- 限流算法（滑动窗口）

**相关文件**:
- server/src/common/guards/throttle.guard.ts
- server/src/common/decorators/throttle.decorator.ts
- server/test/throttle.e2e-spec.ts

**后续 Task**: 无

---

### TASK-389: 实现 SSO 单点登录 API

**类型**: 后端 API

**工作量**: 12h

**优先级**: P2

**依赖**: 无

**描述**:
实现 SSO 单点登录 API，支持 LDAP 和 OAuth2 协议。

**API 端点**:
- POST /api/v1/auth/sso/ldap - LDAP 登录
- GET /api/v1/auth/sso/oauth2/redirect - OAuth2 重定向
- GET /api/v1/auth/sso/oauth2/callback - OAuth2 回调

**验收标准**:
- [ ] 支持 LDAP 登录（ldapjs 库集成）
- [ ] 支持 OAuth2 登录（Google/GitHub/企业微信）
- [ ] LDAP 用户信息同步到本地数据库
- [ ] OAuth2 用户信息同步到本地数据库
- [ ] 登录成功后生成 JWT Token
- [ ] 支持首次登录自动创建账号
- [ ] LDAP/OAuth2 配置文件管理（环境变量）
- [ ] 权限校验（SSO 用户继承默认角色）
- [ ] 异常处理（LDAP 连接失败、OAuth2 授权失败）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**技术要点**:
- ldapjs 库（LDAP 认证）
- passport-oauth2 策略（OAuth2 认证）
- 用户信息映射（LDAP/OAuth2 → 本地用户）

**相关文件**:
- server/src/modules/auth/sso.controller.ts
- server/src/modules/auth/ldap.service.ts
- server/src/modules/auth/oauth2.service.ts
- server/test/sso.e2e-spec.ts

**后续 Task**: TASK-396（前端 SSO 登录页面）

---

## Phase 3: 前端 UI（152h）

### TASK-390: 实现高级搜索页面

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-382

**描述**:
实现高级搜索页面，支持全文搜索、高级筛选、搜索结果高亮。

**页面路由**:
- /search - 高级搜索

**功能要求**:
- 全文搜索输入框（关键词搜索）
- 高级筛选（文档类型、部门、标签、时间范围）
- 搜索结果列表（标题、摘要、高亮关键词）
- 搜索结果分页（支持排序：相关度、时间）
- 搜索历史记录（本地存储）
- 热门搜索词展示

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 全文搜索功能正常（调用 GET /api/v1/search/query）
- [ ] 关键词高亮显示正常
- [ ] 高级筛选功能正常（类型、部门、标签、时间）
- [ ] 搜索结果分页功能正常
- [ ] 搜索历史记录功能正常（localStorage 存储）
- [ ] 热门搜索词功能正常（点击搜索）
- [ ] 权限校验（只显示有权限的文档）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- AdvancedSearch.vue - 高级搜索页面组件
- SearchFilter.vue - 搜索筛选组件
- SearchResult.vue - 搜索结果组件

**相关文件**:
- client/src/views/search/AdvancedSearch.vue
- client/src/components/SearchFilter.vue
- client/src/components/SearchResult.vue

**后续 Task**: 无

---

### TASK-391: 实现智能文档推荐组件

**类型**: 前端 UI

**工作量**: 20h

**优先级**: P1

**依赖**: TASK-383

**描述**:
实现智能文档推荐组件，在首页和文档详情页显示推荐文档。

**功能要求**:
- 首页"推荐文档"模块（显示前 10 条）
- 文档详情页"相关文档"模块（显示前 5 条）
- 推荐理由显示（"查看此文档的用户还查看了..."）
- 推荐文档卡片（标题、类型、部门、更新时间）
- 点击推荐文档跳转到详情页

**验收标准**:
- [ ] 首页"推荐文档"模块显示正常
- [ ] 文档详情页"相关文档"模块显示正常
- [ ] 推荐理由显示正确
- [ ] 推荐文档卡片交互流畅
- [ ] 点击推荐文档跳转正常
- [ ] 推荐数据实时更新（每小时刷新）
- [ ] 无推荐数据时显示提示（"暂无推荐"）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- RecommendedDocuments.vue - 推荐文档组件

**相关文件**:
- client/src/components/RecommendedDocuments.vue
- client/src/views/home/Home.vue
- client/src/views/documents/DocumentDetail.vue

**后续 Task**: 无

---

### TASK-392: 实现批量导出/导入功能

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-384

**描述**:
实现批量导出/导入功能，支持文档、用户数据的批量操作。

**页面路由**:
- /admin/export - 批量导出
- /admin/import - 批量导入

**功能要求**:
- 批量导出（选择导出类型：文档/用户）
- 批量导入（上传 Excel 文件）
- Excel 模板下载（提供标准模板）
- 导入数据预览（显示解析结果）
- 导入结果显示（成功条数 + 失败详情）
- 导入失败详情（行号 + 错误信息）
- 进度条显示（导入/导出进度）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 批量导出功能正常（调用 POST /api/v1/export/documents）
- [ ] 批量导入功能正常（调用 POST /api/v1/import/documents）
- [ ] Excel 模板下载功能正常
- [ ] 导入数据预览功能正常
- [ ] 导入结果显示正确（成功条数 + 失败详情）
- [ ] 导入失败详情显示清晰（行号 + 错误信息）
- [ ] 进度条显示正常（实时更新）
- [ ] 权限校验（管理员权限）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- ExportPage.vue - 批量导出页面组件
- ImportPage.vue - 批量导入页面组件

**相关文件**:
- client/src/views/admin/ExportPage.vue
- client/src/views/admin/ImportPage.vue

**后续 Task**: 无

---

### TASK-393: 实现可视化工作流设计器

**类型**: 前端 UI

**工作量**: 32h

**优先级**: P1

**依赖**: TASK-385

**描述**:
实现可视化工作流设计器，支持拖拽设计工作流、配置条件分支、配置抄送人。

**页面路由**:
- /workflow/designer - 工作流设计器

**功能要求**:
- 拖拽设计工作流（节点拖拽、连线）
- 节点类型（开始节点、审批节点、条件节点、结束节点）
- 条件分支配置（条件表达式编辑器）
- 抄送人配置（用户选择器）
- 工作流预览（流程图可视化）
- 工作流保存（保存为模板）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 拖拽设计功能正常（BPMN.js 集成）
- [ ] 节点类型完整（开始、审批、条件、结束）
- [ ] 条件分支配置功能正常（表达式编辑器）
- [ ] 抄送人配置功能正常（用户多选）
- [ ] 工作流预览功能正常（流程图可视化）
- [ ] 工作流保存功能正常（调用 POST /api/v1/workflow/templates）
- [ ] 条件表达式校验（语法检查）
- [ ] 权限校验（管理员权限）
- [ ] 异常处理
- [ ] 响应式布局

**业务规则**:
- BR-329: 工作流设计器支持可视化拖拽
- BR-335: 排他网关支持条件分支

**技术要点**:
- BPMN.js 库集成（工作流设计器）
- 条件表达式编辑器（Monaco Editor）

**主要组件**:
- WorkflowDesigner.vue - 工作流设计器组件
- ConditionEditor.vue - 条件表达式编辑器组件

**相关文件**:
- client/src/views/workflow/WorkflowDesigner.vue
- client/src/components/ConditionEditor.vue

**后续 Task**: 无

---

### TASK-394: 实现多语言切换功能

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-386

**描述**:
实现多语言切换功能，支持中文/英文界面切换。

**功能要求**:
- 顶部导航栏语言切换按钮
- 语言切换后界面文本自动更新
- 语言偏好本地存储（localStorage）
- 刷新页面后保持语言设置

**验收标准**:
- [ ] 语言切换按钮显示正常（顶部导航栏）
- [ ] 语言切换功能正常（中文 ↔ 英文）
- [ ] 界面文本自动更新（调用 GET /api/v1/i18n/translations/:locale）
- [ ] 语言偏好本地存储（localStorage）
- [ ] 刷新页面后保持语言设置
- [ ] 所有页面文本支持多语言
- [ ] 接口错误信息支持多语言
- [ ] 异常处理
- [ ] 响应式布局

**技术要点**:
- Vue I18n 库集成
- 语言文件动态加载
- 语言偏好本地存储

**主要组件**:
- LanguageSwitcher.vue - 语言切换组件

**相关文件**:
- client/src/components/LanguageSwitcher.vue
- client/src/i18n/index.ts
- client/src/i18n/locales/zh-CN.json
- client/src/i18n/locales/en-US.json

**后续 Task**: 无

---

### TASK-395: 实现数据分析大屏

**类型**: 前端 UI

**工作量**: 20h

**优先级**: P2

**依赖**: TASK-387

**描述**:
实现数据分析大屏，支持文档统计、用户统计、审批统计、设备统计可视化展示。

**页面路由**:
- /statistics/dashboard - 数据分析大屏

**功能要求**:
- 文档统计图表（饼图：按类型分组）
- 用户统计图表（柱状图：按部门分组）
- 审批统计图表（折线图：平均耗时趋势）
- 设备统计图表（仪表盘：完好率）
- 时间范围筛选（本日/本周/本月/自定义）
- 数据实时刷新（每 15 秒刷新）

**验收标准**:
- [ ] 页面布局符合设计稿（大屏展示）
- [ ] 文档统计图表显示正常（ECharts 饼图）
- [ ] 用户统计图表显示正常（ECharts 柱状图）
- [ ] 审批统计图表显示正常（ECharts 折线图）
- [ ] 设备统计图表显示正常（ECharts 仪表盘）
- [ ] 时间范围筛选功能正常
- [ ] 数据实时刷新功能正常（每 15 秒）
- [ ] 权限校验（管理员权限）
- [ ] 异常处理
- [ ] 响应式布局

**技术要点**:
- ECharts 库集成
- 图表自适应布局
- 定时刷新机制

**主要组件**:
- StatisticsDashboard.vue - 数据分析大屏组件

**相关文件**:
- client/src/views/statistics/StatisticsDashboard.vue

**后续 Task**: 无

---

### TASK-396: 实现 SSO 登录页面

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-389

**描述**:
实现 SSO 单点登录页面，支持 LDAP 和 OAuth2 登录。

**页面路由**:
- /login/sso - SSO 登录

**功能要求**:
- LDAP 登录表单（用户名、密码）
- OAuth2 登录按钮（Google/GitHub/企业微信）
- 登录成功后跳转到首页
- 登录失败提示

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] LDAP 登录功能正常（调用 POST /api/v1/auth/sso/ldap）
- [ ] OAuth2 登录功能正常（调用 GET /api/v1/auth/sso/oauth2/redirect）
- [ ] 登录成功后跳转到首页
- [ ] 登录失败提示显示正确
- [ ] 表单校验正确（必填字段）
- [ ] 异常处理
- [ ] 响应式布局

**主要组件**:
- SsoLogin.vue - SSO 登录页面组件

**相关文件**:
- client/src/views/login/SsoLogin.vue

**后续 Task**: 无

---

## Phase 4: 测试（80h）

### TASK-397: 编写高级功能单元测试

**类型**: 测试

**工作量**: 20h

**优先级**: P1

**依赖**: TASK-382~389

**描述**:
编写高级功能模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 全文搜索逻辑（文本提取、索引创建）
- 智能推荐逻辑（协同过滤算法）
- 批量导出/导入逻辑（数据校验）
- 工作流引擎逻辑（条件分支、审批委托）
- 多语言逻辑（翻译文件加载）
- 统计分析逻辑（聚合查询）
- 限流逻辑（Redis 计数器）
- SSO 逻辑（LDAP/OAuth2 认证）

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有核心业务规则有对应测试用例
- [ ] Mock 外部依赖（Prisma、Redis、ElasticSearch、LDAP）
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/search.service.spec.ts
- server/test/recommendation.service.spec.ts
- server/test/export.service.spec.ts
- server/test/workflow.service.spec.ts
- server/test/i18n.service.spec.ts
- server/test/statistics.service.spec.ts
- server/test/throttle.service.spec.ts
- server/test/sso.service.spec.ts

**后续 Task**: 无

---

### TASK-398: 编写高级功能集成测试

**类型**: 测试

**工作量**: 20h

**优先级**: P1

**依赖**: TASK-382~389

**描述**:
编写高级功能模块的集成测试，验证 API 端点。

**测试范围**:
- POST /api/v1/search/index/:documentId
- GET /api/v1/search/query
- POST /api/v1/recommendations/track
- GET /api/v1/recommendations/my
- POST /api/v1/export/documents
- POST /api/v1/import/documents
- POST /api/v1/workflow/templates
- POST /api/v1/workflow/tasks/:id/delegate
- GET /api/v1/i18n/translations/:locale
- GET /api/v1/statistics/documents
- POST /api/v1/auth/sso/ldap

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 测试覆盖业务规则校验
- [ ] 所有测试通过

**相关文件**:
- server/test/search.e2e-spec.ts
- server/test/recommendation.e2e-spec.ts
- server/test/export.e2e-spec.ts
- server/test/workflow.e2e-spec.ts
- server/test/i18n.e2e-spec.ts
- server/test/statistics.e2e-spec.ts
- server/test/sso.e2e-spec.ts

**后续 Task**: 无

---

### TASK-399: 编写高级功能 E2E 测试

**类型**: 测试

**工作量**: 24h

**优先级**: P2

**依赖**: TASK-390~396

**描述**:
编写高级功能模块的 E2E 测试，验证关键用户流程。

**测试场景**:
1. 用户搜索文档 → 全文搜索 → 高级筛选 → 查看搜索结果 → 点击文档跳转
2. 用户查看首页 → 查看推荐文档 → 点击推荐文档 → 查看文档详情 → 查看相关文档
3. 管理员批量导出文档 → 下载 Excel → 批量导入文档 → 查看导入结果
4. 管理员设计工作流 → 配置条件分支 → 配置抄送人 → 保存模板
5. 用户切换语言 → 界面文本更新 → 刷新页面 → 保持语言设置
6. 管理员查看数据分析大屏 → 切换时间范围 → 查看图表更新
7. 用户 SSO 登录 → LDAP 登录 → 跳转到首页

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过

**相关文件**:
- client/e2e/search.spec.ts
- client/e2e/recommendation.spec.ts
- client/e2e/export.spec.ts
- client/e2e/workflow.spec.ts
- client/e2e/i18n.spec.ts
- client/e2e/statistics.spec.ts
- client/e2e/sso.spec.ts

**后续 Task**: 无

---

### TASK-400: 编写高级功能性能测试

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-382~389

**描述**:
编写高级功能模块的性能测试，验证系统性能指标。

**测试场景**:
1. 全文搜索性能测试（1000 次/秒搜索请求）
2. 推荐算法性能测试（生成 10000 用户推荐）
3. 批量导出性能测试（导出 10000 条记录）
4. 批量导入性能测试（导入 10000 条记录）
5. 工作流引擎性能测试（1000 个并发工作流实例）
6. 统计分析性能测试（查询 100 万条记录）
7. 限流性能测试（超出限流阈值验证）

**验收标准**:
- [ ] 全文搜索响应时间 < 200ms（P95）
- [ ] 推荐算法生成时间 < 5s（10000 用户）
- [ ] 批量导出时间 < 10s（10000 条记录）
- [ ] 批量导入时间 < 30s（10000 条记录）
- [ ] 工作流引擎响应时间 < 500ms（P99）
- [ ] 统计分析查询时间 < 3s（100 万条记录）
- [ ] 限流功能正常（超出阈值返回 429）
- [ ] 所有性能测试通过

**技术要点**:
- k6 压测工具
- 性能指标监控（Prometheus + Grafana）

**相关文件**:
- server/test/performance/search.perf.ts
- server/test/performance/recommendation.perf.ts
- server/test/performance/export.perf.ts
- server/test/performance/workflow.perf.ts
- server/test/performance/statistics.perf.ts

**后续 Task**: 无

---

## Phase 5: 集成与优化（32h）

### TASK-401: 集成 ElasticSearch 全文搜索引擎

**类型**: 集成

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-382

**描述**:
集成 ElasticSearch 全文搜索引擎，配置索引、分词器、映射。

**集成要点**:
- ElasticSearch 部署（Docker Compose）
- 索引创建（documents 索引）
- 映射配置（Mapping）
- 中文分词器（ik_max_word）
- 同义词配置（Synonym）
- 索引自动更新（文档创建/更新时自动索引）

**验收标准**:
- [ ] ElasticSearch 部署成功（Docker Compose）
- [ ] documents 索引创建成功
- [ ] Mapping 配置正确（title, content, type, department, tags）
- [ ] 中文分词器配置正确（ik_max_word）
- [ ] 同义词配置正确（synonyms.txt）
- [ ] 索引自动更新功能正常（监听文档创建/更新事件）
- [ ] 全文搜索功能正常（调用 ElasticSearch API）
- [ ] 异常处理（ES 连接失败、索引失败）
- [ ] 单元测试覆盖率 ≥ 80%

**技术要点**:
- ElasticSearch 7.x 版本
- @nestjs/elasticsearch 库
- ik_max_word 中文分词器
- 事件监听器（文档创建/更新）

**相关文件**:
- docker/docker-compose.elasticsearch.yml
- server/src/modules/search/elasticsearch.config.ts
- server/src/modules/documents/documents.listener.ts

**后续 Task**: 无

---

### TASK-402: 集成 LDAP/OAuth2 单点登录

**类型**: 集成

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-389

**描述**:
集成 LDAP 和 OAuth2 单点登录，配置认证策略、用户信息映射。

**集成要点**:
- LDAP 连接配置（ldapjs）
- LDAP 用户认证（bindDN + search）
- LDAP 用户信息映射（sAMAccountName → username, cn → realName）
- OAuth2 配置（Google/GitHub/企业微信）
- OAuth2 用户认证（授权码模式）
- OAuth2 用户信息映射（email → username, name → realName）
- 用户自动创建（首次登录自动创建账号）

**验收标准**:
- [ ] LDAP 连接配置正确（环境变量）
- [ ] LDAP 用户认证功能正常（bindDN + search）
- [ ] LDAP 用户信息映射正确
- [ ] OAuth2 配置正确（Google/GitHub/企业微信）
- [ ] OAuth2 用户认证功能正常（授权码模式）
- [ ] OAuth2 用户信息映射正确
- [ ] 用户自动创建功能正常（首次登录）
- [ ] 权限校验（SSO 用户继承默认角色）
- [ ] 异常处理（LDAP 连接失败、OAuth2 授权失败）
- [ ] 单元测试覆盖率 ≥ 80%

**技术要点**:
- ldapjs 库（LDAP 认证）
- passport-oauth2 策略（OAuth2 认证）
- 用户信息映射配置

**相关文件**:
- server/src/modules/auth/ldap.config.ts
- server/src/modules/auth/oauth2.config.ts
- server/src/modules/auth/user-mapping.ts

**后续 Task**: 无

---

**本文档完成 ✅**（共 24 个 TASK，TASK-379 ~ TASK-402）
