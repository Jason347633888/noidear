# 统计分析（基础报表） - Task 分解

> **来源**: docs/design/mvp/08_统计分析.md  
> **总工作量**: 160h  
> **优先级**: P1（MVP 功能）  
> **依赖**: 文档管理模块（TASK-001）、任务管理模块（TASK-038）

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 0 | 0h（复用已有表） |
| 后端 API | 4 | 64h |
| 前端 UI | 3 | 48h |
| 测试 | 3 | 48h |
| **总计** | **10** | **160h** |

---

## TASK-100: 实现文档统计 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-001

**描述**: 实现文档统计 API，按级别/部门/状态统计文档数量。

**API 端点**:
- GET /api/v1/statistics/documents

**验收标准**:
- [ ] 支持按级别统计（1/2/3级）
- [ ] 支持按部门统计
- [ ] 支持按状态统计（草稿/审批中/已发布）
- [ ] 支持按时间段统计（本月/本季度/本年）
- [ ] 返回统计数据（总数、增长率）
- [ ] 权限校验
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**技术要点**:
- 使用 Redis 缓存统计结果
  - 缓存 key 格式: `statistics:documents:{filters_hash}`
  - 缓存内容: 统计结果 JSON
  - 缓存过期时间: 5 分钟
- 数据变更时清除相关缓存

**相关文件**:
- server/src/modules/statistics/statistics.controller.ts
- server/src/modules/statistics/statistics.service.ts

---

## TASK-101: 实现任务统计 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-038

**描述**: 实现任务统计 API，按部门/模板/状态统计任务数量。

**API 端点**:
- GET /api/v1/statistics/tasks

**验收标准**:
- [ ] 支持按部门统计
- [ ] 支持按模板统计
- [ ] 支持按状态统计（待完成/已完成/已取消）
- [ ] 支持按时间段统计
- [ ] 计算任务完成率、逾期率
- [ ] 权限校验
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**技术要点**:
- 使用 Redis 缓存统计结果
  - 缓存 key 格式: `statistics:tasks:{filters_hash}`
  - 缓存内容: 统计结果 JSON
  - 缓存过期时间: 5 分钟
- 数据变更时清除相关缓存

**相关文件**:
- server/src/modules/statistics/statistics.controller.ts
- server/src/modules/statistics/statistics.service.ts

---

## TASK-102: 实现审批统计 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-053

**描述**: 实现审批统计 API，按审批人/状态统计审批数量。

**API 端点**:
- GET /api/v1/statistics/approvals

**验收标准**:
- [ ] 支持按审批人统计
- [ ] 支持按状态统计（待审批/已通过/已驳回）
- [ ] 支持按时间段统计
- [ ] 计算审批通过率、平均审批时长
- [ ] 权限校验
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**技术要点**:
- 使用 Redis 缓存统计结果
  - 缓存 key 格式: `statistics:approvals:{filters_hash}`
  - 缓存内容: 统计结果 JSON
  - 缓存过期时间: 5 分钟
- 数据变更时清除相关缓存

**相关文件**:
- server/src/modules/statistics/statistics.controller.ts
- server/src/modules/statistics/statistics.service.ts

---

## TASK-103: 实现综合统计 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-100, TASK-101, TASK-102, TASK-091（偏离统计 API）

**描述**: 实现综合统计 API，汇总所有关键指标。

**API 端点**:
- GET /api/v1/statistics/overview

**验收标准**:
- [ ] 返回文档总数、任务总数、审批总数
- [ ] 返回本月新增数据
- [ ] 返回关键指标：
  - 任务完成率（来自 TASK-101）
  - 审批通过率（来自 TASK-102）
  - 偏离率（来自 TASK-091）
- [ ] 支持时间段筛选
- [ ] 权限校验
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**相关文件**:
- server/src/modules/statistics/statistics.controller.ts
- server/src/modules/statistics/statistics.service.ts

---

## TASK-104: 实现统计概览页面（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-103

**描述**: 实现统计概览页面，展示关键指标。

**页面路由**: `/statistics/overview`

**功能要求**:
- 关键指标卡片（文档总数、任务总数、审批总数）
- 本月新增数据
- 关键指标趋势图表（ECharts）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 关键指标卡片正确展示
- [ ] 趋势图表正确展示（折线图）
- [ ] 权限校验
- [ ] 异常处理

**相关文件**:
- client/src/views/statistics/Overview.vue

---

## TASK-105: 实现文档统计页面（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-100

**描述**: 实现文档统计页面，展示文档统计图表。

**页面路由**: `/statistics/documents`

**功能要求**:
- 文档统计图表（ECharts）
- 按级别/部门/状态筛选
- 导出报表

**验收标准**:
- [ ] 统计图表正确展示（柱状图/饼图）
- [ ] 筛选功能正常
- [ ] 导出功能正常
- [ ] 权限校验
- [ ] 异常处理

**相关文件**:
- client/src/views/statistics/DocumentStatistics.vue

---

## TASK-106: 实现任务统计页面（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-101

**描述**: 实现任务统计页面，展示任务统计图表。

**页面路由**: `/statistics/tasks`

**功能要求**:
- 任务统计图表（ECharts）
- 按部门/模板/状态筛选
- 显示任务完成率、逾期率
- 导出报表

**验收标准**:
- [ ] 统计图表正确展示（柱状图/折线图）
- [ ] 筛选功能正常
- [ ] 任务完成率、逾期率计算正确
- [ ] 导出功能正常
- [ ] 权限校验
- [ ] 异常处理

**相关文件**:
- client/src/views/statistics/TaskStatistics.vue

---

## TASK-107: 编写统计分析单元测试（后端）

**类型**: 测试
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-100, TASK-101, TASK-102, TASK-103

**描述**: 编写统计分析模块的单元测试。

**测试范围**:
- 文档统计逻辑
- 任务统计逻辑
- 审批统计逻辑
- 综合统计逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] 所有测试通过

**相关文件**:
- server/test/statistics.service.spec.ts

---

## TASK-108: 编写统计分析集成测试（后端）

**类型**: 测试
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-100, TASK-101, TASK-102, TASK-103

**描述**: 编写统计分析模块的集成测试。

**测试范围**:
- GET /api/v1/statistics/documents
- GET /api/v1/statistics/tasks
- GET /api/v1/statistics/approvals
- GET /api/v1/statistics/overview

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 所有测试通过

**相关文件**:
- server/test/statistics.e2e-spec.ts

---

## TASK-109: 编写前端组件单元测试

**类型**: 测试
**工作量**: 16h
**优先级**: P2
**依赖**: TASK-104, TASK-105, TASK-106

**描述**: 编写前端组件的单元测试。

**测试范围**:
- Overview.vue
- DocumentStatistics.vue
- TaskStatistics.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 所有测试通过

**相关文件**:
- client/src/views/statistics/__tests__/Overview.spec.ts
- client/src/views/statistics/__tests__/DocumentStatistics.spec.ts
- client/src/views/statistics/__tests__/TaskStatistics.spec.ts

---

**本文档完成 ✅**
