# 配方偏离检测（Phase 7-8） - Task 分解

> **来源**: docs/design/mvp/07_配方偏离检测.md  
> **总工作量**: 200h  
> **优先级**: P1（MVP 功能）  
> **依赖**: 模板管理模块（TASK-021）、任务管理模块（TASK-038）、审批流程模块（TASK-053）

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 1 | 8h |
| 后端 API | 4 | 64h |
| 前端 UI | 4 | 64h |
| 测试 | 4 | 64h |
| **总计** | **13** | **200h** |

---

## TASK-087: 创建偏离报告数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P1
**依赖**: TASK-038（任务记录表）

**描述**: 创建 deviation_reports 表，用于存储偏离报告。

**表结构设计**:
```sql
deviation_reports (
  id              SnowflakeID   PRIMARY KEY,
  record_id       SnowflakeID   REFERENCES task_records(id),
  field_name      VARCHAR(100)  NOT NULL,
  expected_value  VARCHAR(500),
  actual_value    VARCHAR(500),
  deviation_amount DECIMAL(10,2),
  deviation_rate   DECIMAL(5,2),
  reason          TEXT,
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending',
  reported_at     TIMESTAMP,
  creator_id      SnowflakeID   REFERENCES users(id),
  created_at      TIMESTAMP   DEFAULT NOW(),
  updated_at      TIMESTAMP   DEFAULT NOW(),
  deleted_at      TIMESTAMP
);
```

**验收标准**:
- [ ] Prisma Schema 编写完成
- [ ] deviation_reports 表包含所有字段：
  - id, record_id, field_name, expected_value, actual_value
  - deviation_amount, deviation_rate, reason, status, reported_at
  - creator_id, created_at, updated_at, deleted_at
- [ ] 外键约束配置正确：
  - record_id 引用 task_records(id)
  - creator_id 引用 users(id)
- [ ] 索引配置正确（record_id, status, created_at）
- [ ] 数据库迁移文件生成
- [ ] 软删除字段配置正确（deleted_at DateTime?）

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_deviation_reports/

---

## TASK-088: 实现偏离检测逻辑（后端）

**类型**: 后端 API
**工作量**: 24h
**优先级**: P1
**依赖**: TASK-087

**描述**: 实现偏离检测逻辑，支持范围公差和百分比公差。

**API 端点**:
- POST /api/v1/deviations/check - 检测偏离

**验收标准**:
- [ ] 范围公差检测逻辑正确（min/max）
- [ ] 百分比公差检测逻辑正确（percentage）
- [ ] 计算偏离量/偏离率正确
- [ ] 返回偏离字段列表
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**相关文件**:
- server/src/modules/deviation/deviation.service.ts
- server/test/deviation.service.spec.ts

---

## TASK-089: 实现偏离报告生成 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-088

**描述**: 实现偏离报告生成 API，在任务提交时自动生成偏离报告。

**业务逻辑**:
1. 检测任务记录是否有偏离字段
2. 为每个偏离字段生成偏离报告
3. 保存到 deviation_reports 表（status: pending）
4. 触发 2 级审批流程

**验收标准**:
- [ ] 偏离报告生成逻辑正确
- [ ] 保存到 deviation_reports 表
- [ ] 触发 2 级审批流程
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**相关文件**:
- server/src/modules/deviation/deviation.service.ts
- server/test/deviation.service.spec.ts

---

## TASK-090: 实现偏离报告查询 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-087

**描述**: 实现偏离报告查询 API，支持分页、筛选。

**API 端点**:
- GET /api/v1/deviations - 查询偏离报告列表
- GET /api/v1/deviations/:id - 查询偏离报告详情

**验收标准**:
- [ ] 支持分页查询
- [ ] 支持筛选（状态、日期范围）
- [ ] 返回完整的关联信息（任务记录信息、模板信息）
- [ ] 权限校验
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**相关文件**:
- server/src/modules/deviation/deviation.controller.ts
- server/src/modules/deviation/deviation.service.ts

---

## TASK-091: 实现偏离统计 API

**类型**: 后端 API
**工作量**: 8h
**优先级**: P2
**依赖**: TASK-087

**描述**: 实现偏离统计 API，按部门/模板/时间段统计偏离率。

**API 端点**:
- GET /api/v1/deviations/statistics - 统计偏离率

**验收标准**:
- [ ] 支持按部门统计
- [ ] 支持按模板统计
- [ ] 支持按时间段统计
- [ ] 计算偏离率正确
- [ ] 异常处理
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）

**相关文件**:
- server/src/modules/deviation/deviation.controller.ts
- server/src/modules/deviation/deviation.service.ts

---

## TASK-092: 实现偏离实时检测组件（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-088

**描述**: 实现偏离实时检测组件，在动态表单中实时检测偏离。

**功能要求**:
- 集成到动态表单组件（TASK-030）
- 输入时实时调用偏离检测 API
- 偏离字段标红显示
- 显示偏离量/偏离率

**验收标准**:
- [ ] 实时检测功能正常（输入时触发）
- [ ] 偏离字段标红显示
- [ ] 显示偏离量/偏离率
- [ ] 防抖优化（避免频繁调用 API）
- [ ] 异常处理

**相关文件**:
- client/src/components/DynamicForm.vue
- client/src/components/fields/NumberField.vue

---

## TASK-093: 实现偏离原因填写对话框（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-089

**描述**: 实现偏离原因填写对话框，在提交有偏离的任务时弹出。

**功能要求**:
- 列出所有偏离字段
- 为每个偏离字段填写原因（必填）
- 显示偏离量/偏离率
- 提交后生成偏离报告

**验收标准**:
- [ ] 对话框正确列出偏离字段
- [ ] 偏离原因输入框正确（必填）
- [ ] 显示偏离量/偏离率
- [ ] 提交功能正常（调用 TASK-089 API）
- [ ] 表单验证（原因必填）
- [ ] 异常处理

**相关文件**:
- client/src/components/DeviationDialog.vue

---

## TASK-094: 实现偏离报告列表页面（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-090

**描述**: 实现偏离报告列表页面，查看所有偏离报告。

**页面路由**: `/deviations`

**功能要求**:
- 偏离报告列表展示（表格）
- 筛选（状态、日期范围）
- 分页
- 查看详情

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 偏离报告列表正确展示（字段名称、期望值、实际值、偏离量、原因、状态）
- [ ] 筛选功能正常
- [ ] 分页功能正常
- [ ] 查看详情功能正常
- [ ] 权限校验
- [ ] 异常处理

**相关文件**:
- client/src/views/deviation/DeviationList.vue

---

## TASK-095: 实现偏离统计页面（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P2
**依赖**: TASK-091

**描述**: 实现偏离统计页面，展示偏离率统计图表。

**页面路由**: `/statistics/deviations`

**功能要求**:
- 偏离率统计图表（ECharts）
- 按部门/模板/时间段筛选
- 导出报表

**验收标准**:
- [ ] 统计图表正确展示（柱状图/折线图）
- [ ] 筛选功能正常
- [ ] 导出功能正常
- [ ] 权限校验
- [ ] 异常处理

**相关文件**:
- client/src/views/statistics/DeviationStatistics.vue

---

## TASK-096: 编写偏离检测单元测试（后端）

**类型**: 测试
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-088, TASK-089, TASK-090

**描述**: 编写偏离检测模块的单元测试。

**测试范围**:
- 偏离检测逻辑
- 偏离报告生成逻辑
- 偏离报告查询逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%（核心业务逻辑必须 100%，边缘逻辑可低于 80%）
- [ ] 所有测试通过

**相关文件**:
- server/test/deviation.service.spec.ts

---

## TASK-097: 编写偏离检测集成测试（后端）

**类型**: 测试
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-088, TASK-089, TASK-090

**描述**: 编写偏离检测模块的集成测试。

**测试范围**:
- POST /api/v1/deviations/check
- GET /api/v1/deviations
- GET /api/v1/deviations/:id
- GET /api/v1/deviations/statistics

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 所有测试通过

**相关文件**:
- server/test/deviation.e2e-spec.ts

---

## TASK-098: 编写前端组件单元测试

**类型**: 测试
**工作量**: 16h
**优先级**: P2
**依赖**: TASK-092, TASK-093, TASK-094

**描述**: 编写前端组件的单元测试。

**测试范围**:
- DeviationDialog.vue
- DeviationList.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 所有测试通过

**相关文件**:
- client/src/components/__tests__/DeviationDialog.spec.ts
- client/src/views/deviation/__tests__/DeviationList.spec.ts

---

## TASK-099: 编写 E2E 测试（Playwright）

**类型**: 测试
**工作量**: 16h
**优先级**: P2
**依赖**: TASK-092, TASK-093, TASK-094

**描述**: 编写偏离检测模块的 E2E 测试。

**测试场景**:
1. 员工填写偏离数据 → 实时标红 → 提交 → 填写原因 → 触发 2 级审批
2. 查看偏离报告列表 → 筛选 → 查看详情
3. 查看偏离统计报表

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 所有测试通过

**相关文件**:
- client/e2e/deviation.spec.ts

---

**本文档完成 ✅**
