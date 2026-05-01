# 品质管控与放行模块

---
module_id: quality-qc-release
business_chain:
  - ProductionBatch -> CCPRecord / EnvironmentRecord / ProcessMonitorRecord / MetalDetectionLog / FragileItemInspection -> 放行判断
module_type:
  - 过程记录
  - QC 放行判断依据
source_of_truth:
  - server/src/prisma/schema.prisma: CCPPoint, CCPRecord, EnvironmentRecord, ProcessMonitorRecord
  - server/src/modules/ccp/
  - server/src/modules/environment-record/
  - server/src/modules/process-record/
  - server/src/modules/fragile-item-inspection/
facts_or_projections:
  - CCPRecord, EnvironmentRecord, ProcessMonitorRecord 为事实记录，每条挂接 production_batch_id
  - FragileItemInspection 生产批次关联为可选字段（production_batch_id?）
downstream_consumers:
  - 不合格品模块（NonConformance）：CCP 偏差、环境超标触发
  - 追溯模块：放行类记录挂接在 ProductionBatch 链路上
  - 召回模块：查询该批次是否通过 CCP 监控
current_entrypoints:
  - /ccp/records → CcpRecordList.vue
  - /environment-records → EnvironmentRecordList.vue
  - /process-records → ProcessRecordList.vue
  - /fragile-item-inspections → FragileItemInspectionList.vue
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

本模块覆盖生产过程中与批次放行直接相关的四类记录：

| 记录类型 | 业务用途 | 代码模型 |
|---|---|---|
| CCP 监控记录 | 关键控制点实测值与临界限比对 | `CCPRecord` / `CCPPoint` |
| 环境记录 | 温湿度、正负压前提方案监控 | `EnvironmentRecord` |
| 过程参数监控 | 烤炉/蒸炉等工艺参数 | `ProcessMonitorRecord` |
| 玻璃及硬塑完整性检查 | 异物控制 | `FragileItemInspection` |

这四类记录共同构成 `ProductionBatch` 是否满足放行条件的证据链。当前系统**尚无统一放行状态机**，各类记录独立存储，放行判断由人工汇总。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 制造部（ZZ） | 记录 CCP 实测值、过程参数 | 填写 CCPRecord、ProcessMonitorRecord |
| 品质部（PZ）/ 质检组（ZJ） | 验证 CCP 结果、环境合规 | 审查 CCPRecord、EnvironmentRecord |
| 品质部 | 判断批次放行 | 汇总上述记录手动决策 |

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| `/ccp/records` | `CcpRecordList.vue` | 无独立 API 文件，直接 request | `POST /ccp/records`, `GET /ccp/records/batch/:batchId`, `GET /ccp/records/missing/:batchId` | `server/src/modules/ccp/` |
| `/environment-records` | `EnvironmentRecordList.vue` | 无独立 API 文件 | `environment-record` 模块 routes | `server/src/modules/environment-record/` |
| `/process-records` | `ProcessRecordList.vue` | 无独立 API 文件 | `process-record` 模块 routes | `server/src/modules/process-record/` |
| `/fragile-item-inspections` | `FragileItemInspectionList.vue` | 无独立 API 文件 | `fragile-item-inspection` 模块 routes | `server/src/modules/fragile-item-inspection/` |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `CCPPoint` | FK `process_step_id` 关联工序，字段有 `cl_min/cl_max/cl_unit` | `已验证`: schema.prisma line 2950 |
| `CCPRecord` | FK `production_batch_id` + `ccp_point_id`，强 FK 约束 | `已验证`: schema.prisma line 2975，create-ccp-record.dto.ts |
| `EnvironmentRecord` | `production_batch_id` 为 **可选**（`String?`），`location` 为自由文本 | `已验证`: schema.prisma line 3164 |
| `ProcessMonitorRecord` | FK `production_batch_id` 强制关联 | `已验证`: schema.prisma line 3180 |
| `FragileItemInspection` | `production_batch_id` 为 **可选**（`String?`），无强 FK 约束 | `已验证`: schema.prisma line 3520 |
| CCP findMissingCCPs | 查询所有 company_id='1' 的 CCPPoint 与已填记录的差集 | `已验证`: ccp.service.ts line 34–51 |
| `company_id` | 所有服务均硬编码为 `'1'` | `已验证`: ccp.service.ts, 多处 |

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 品质/研发在 CCPPoint 中定义 CCP 控制点（关联工序步骤） | CCPPoint 存储临界限和监控方法 | `ccp` | 无法评估生产记录是否合规 |
| 2 | 制造/质检在生产中填写 CCPRecord（关联生产批次、CCP 点、实测值） | 系统比对 is_within_cl 标志 | `ccp` | 无追溯证据，放行无依据 |
| 3 | 品质填写 EnvironmentRecord（关联生产批次） | 温湿度/压差数据归档 | `environment-record` | 前提方案监控缺失 |
| 4 | 制造填写 ProcessMonitorRecord（强 FK 关联生产批次） | 工艺参数归档 | `process-record` | 无法证明工艺合规性 |
| 5 | 质检完成 FragileItemInspection | 异物控制记录归档 | `fragile-item-inspection` | 无异物控制证据 |
| 6 | 品质汇总上述记录，手动决定批次放行 | **当前系统无放行状态机** | 无 | 放行决策不可追溯 |

## 6. 上下游绑定关系

- **上游**：`ProductionBatch`（所有记录的核心锚点），`CCPPoint`（CCP 控制点主数据，挂接 `ProcessStep`）
- **下游**：`NonConformance`（当 `is_within_cl = false` 或 `is_within_spec = false` 时，应触发不合格品记录，当前系统无自动触发）；`ProductRecall`（批次放行记录是召回证据链的一部分）

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-300 | `EnvironmentRecord.production_batch_id` 为可选字段，允许不关联任何批次记录 | schema 设计为 nullable | 环境记录脱离追溯链，无法证明某批次生产时环境合规 | P1 | 已验证 | schema.prisma line 3167: `production_batch_id String?` |
| GAP-301 | `FragileItemInspection.production_batch_id` 为可选字段 | schema 设计为 nullable | 异物控制记录无法关联到具体批次，无法用于批次放行或召回证据链 | P1 | 已验证 | schema.prisma line 3457: `production_batch_id String?` |
| GAP-302 | `EnvironmentRecord.location` 为自由文本字符串，非 FK 关联 `Location` 主数据 | schema 设计 | 位置信息无法与 Location 主数据关联，无法做位置维度查询 | P2 | 已验证 | schema.prisma line 3170: `location String` |
| GAP-303 | `CcpService.findMissingCCPs` 仅对比 `company_id='1'` 的全部 CCPPoint，未按产品或配方过滤 | 服务层实现不完整 | 不同产品的 CCP 要求不同，当前算法会误报与本批次产品无关的 CCP 为缺失 | P1 | 已验证 | ccp.service.ts line 46–50 |
| GAP-304 | 所有 QC 记录模块中 `company_id` 均硬编码为 `'1'`，不支持多租户 | 服务层实现硬编码 | SaaS 多公司隔离失效 | P0 | 已验证 | ccp.service.ts, non-conformance.service.ts, corrective-action.service.ts, customer-complaint.service.ts |
| GAP-305 | 系统无批次放行状态机：CCPRecord 的 `is_within_cl = false` 不会自动触发不合格品流程 | 功能缺失 | 偏差不能自动流转，依赖人工手动填写不合格品，存在漏报风险 | P1 | 已验证（功能缺失） | ccp.service.ts 无触发逻辑；non-conformance.service.ts 无 CCP 触发路径 |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-300 | 将 EnvironmentRecord.production_batch_id 改为非空 FK，至少在业务层校验 | 生产批次模块 | 否 | fix/environment-record-batch-fk | 是 |
| GAP-301 | 将 FragileItemInspection.production_batch_id 改为非空 FK，或明确哪些场景允许无批次 | 生产批次模块 | 需业务确认 | fix/fragile-item-batch-fk | 是 |
| GAP-302 | 将 EnvironmentRecord.location 改为 FK 关联 Location 表，或新增 location_id 字段 | Location 主数据 | 否 | fix/environment-record-location-fk | 是 |
| GAP-303 | findMissingCCPs 按产品/配方下的 CCPPoint 过滤，而非全量 | ccp, recipe, product | 否 | fix/ccp-missing-filter-by-product | 是 |
| GAP-304 | 将 company_id 改为从认证 JWT 中动态提取，全模块统一 | auth | 否（参考其他已改造模块） | fix/company-id-from-jwt | 否（需要跨模块统一） |
| GAP-305 | 在 CCPRecord 创建时，若 is_within_cl=false，自动创建 NonConformance 记录 | non-conformance | 是（需事务联动设计） | feat/ccp-to-nc-auto-trigger | 否（依赖 GAP-5 修复） |

## 9. 证据索引

- `server/src/prisma/schema.prisma` line 2950–3000：CCPPoint, CCPRecord 模型
- `server/src/prisma/schema.prisma` line 3164–3215：EnvironmentRecord, ProcessMonitorRecord 模型
- `server/src/prisma/schema.prisma` line 3520–3535：FragileItemInspection 模型
- `server/src/modules/ccp/ccp.service.ts`：CCP 记录服务，findMissingCCPs 逻辑
- `server/src/modules/ccp/ccp.controller.ts`：CCP 控制器，三个端点
- `client/src/router/index.ts` line 692–697：CCP 路由定义

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| CCP 控制点主数据 | `CCPPoint`（挂接 ProcessStep） | ccp_no, hazard_type, critical_limit, cl_min/max | 不允许在 CCPRecord 中重新维护临界限文本 | - |
| CCP 实测记录 | `CCPRecord` | measured_value, is_within_cl, deviation_action | 不允许在 ProcessMonitorRecord 中重复存储 CCP 测量 | - |
| 环境监控记录 | `EnvironmentRecord` | temperature, humidity, pressure_diff, is_within_spec | 不允许在 ProcessMonitorRecord 中重复存储温湿度 | - |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P0 | GAP-304 | fix/company-id-from-jwt | auth 模块 JWT user 中包含 company_id | 否 | npm run verify |
| P1 | GAP-303 | fix/ccp-missing-filter-by-product | product / recipe 模块 | 是 | GET /ccp/records/missing/:batchId 返回结果验证 |
| P1 | GAP-300 | fix/environment-record-batch-fk | 无 | 是 | npm run verify |
| P1 | GAP-305 | feat/ccp-to-nc-auto-trigger | GAP-304, non-conformance | 否 | 集成测试验证 |
| P2 | GAP-301 | fix/fragile-item-batch-fk | 业务确认 | 是 | npm run verify |
| P2 | GAP-302 | fix/environment-record-location-fk | Location 主数据 | 是 | npm run verify |
