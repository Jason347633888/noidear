# GAP-314 Safe Sequence Number Generation 设计

## 背景和现状

GAP-314 覆盖 `nonconformance-capa` 模块中两个治理记录编号：

- `NonConformance.nc_no`
- `CorrectiveAction.capa_no`

当前服务层均使用 `count()+1` 生成编号：

- `server/src/modules/non-conformance/non-conformance.service.ts:9-11`
- `server/src/modules/corrective-action/corrective-action.service.ts:9-11`

两个表在 schema 中已有公司级唯一约束：

- `NonConformance @@unique([company_id, nc_no])`
- `CorrectiveAction @@unique([company_id, capa_no])`

这能防止重复数据最终落库，但不能防止并发请求先读到同一个 count，再生成同一个编号，随后其中一个请求因唯一约束失败。对不合格和 CAPA 来说，编号是审计、追溯和管理评审的业务索引，不应依赖偶发冲突来兜底。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`NonConformance` 和 `CorrectiveAction` 是治理层共享实体；CAPA/不合格/返工必须使用现有事实源，不得另建平行业务记录。
- `docs/module-usage/09-nonconformance-capa.md`：GAP-314 已验证，问题是 `nc_no` / `capa_no` 使用 `count()+1`，高并发下不安全。
- `server/src/prisma/schema.prisma`：
  - `NonConformance` 字段 `company_id`, `nc_no`，唯一约束 `@@unique([company_id, nc_no])`。
  - `CorrectiveAction` 字段 `company_id`, `capa_no`，唯一约束 `@@unique([company_id, capa_no])`。
  - `NumberRule` / `PendingNumber` 已存在，但语义绑定文控编号和部门，不适合作为 NC/CAPA 的事实源。
- `server/src/modules/document/services/number-rule.service.ts` 使用 `SELECT ... FOR UPDATE` 锁定文控编号规则，说明仓库已接受数据库行锁作为编号并发控制方式。
- `server/src/modules/batch-trace/services/batch-number-generator.service.ts` 使用内存 `Map` 维护序号，只适合当前进程内批次编号缓存，不能满足多实例或重启后的 NC/CAPA 审计编号要求。

## 业务边界

GAP-314 只处理编号生成的并发安全，不改变不合格/CAPA 的业务状态机。

目标编号规则：

- `NonConformance.nc_no` 保持现有展示格式：`NC-<YYYY>-<0001>`
- `CorrectiveAction.capa_no` 保持现有展示格式：`CAPA-<YYYY>-<0001>`
- 序列按 `company_id + scope + period` 隔离：
  - `scope='non_conformance'` 对应 NC 编号
  - `scope='corrective_action'` 对应 CAPA 编号
  - `period` 使用当前年份字符串，例如 `2026`
- 每次生成编号必须在数据库事务中递增持久化序列表，避免并发请求拿到相同序号。
- 继续保留 `@@unique([company_id, nc_no])` 和 `@@unique([company_id, capa_no])` 作为最终防线。

推荐设计：

新增最小通用业务编号序列表 `BusinessNumberSequence`，只记录序列游标，不承载具体业务事实：

- `company_id`
- `scope`
- `period`
- `current_value`
- `created_at`
- `updated_at`
- `@@unique([company_id, scope, period])`

新增共享服务 `QualityNumberSequenceService` 或同等命名服务，提供：

- `generateNonConformanceNo(companyId: string, now?: Date): Promise<string>`
- `generateCorrectiveActionNo(companyId: string, now?: Date): Promise<string>`

服务内部用 Prisma transaction + PostgreSQL row lock 获取并递增 `business_number_sequences`。当行不存在时，先按历史最大号计算初始值，再用 `INSERT ... ON CONFLICT DO NOTHING` 创建序列行，随后重新 `SELECT ... FOR UPDATE` 锁定该行并递增，避免首次初始化时两个并发请求同时插入导致唯一冲突。

## 不做什么

- 不改 `NonConformance.source_type + source_id` 多态来源校验；这是 GAP-313。
- 不实现 `disposition='rework'` 自动创建 `ReworkRecord`；这是 GAP-315。
- 不校验 `CorrectiveAction.trigger_id` 是否真实存在；这是 GAP-316。
- 不改 `NonConformance` 查询索引；GAP-317 已有独立 plan，且当前 schema 已出现相关索引。
- 不改 `ReworkRecord.nc_id` 的 FK 语义；这是 GAP-318。
- 不新增前端编号规则页面，不把 NC/CAPA 接入文控 `NumberRule` 管理页面。
- 不重排或回填历史 `nc_no` / `capa_no`。
- 不用时间戳+随机数替代可读序号；该方案虽然并发安全，但会破坏审计人员对年度连续编号的预期。

## 数据 / 接口 / 页面影响

### 数据影响

- 新增 Prisma model 和 migration：`BusinessNumberSequence` / `business_number_sequences`。
- `NonConformance` 和 `CorrectiveAction` 表结构保持不变。
- 保留两个业务表现有唯一约束。

### 接口影响

- `POST /non-conformances` 响应中的 `nc_no` 格式不变。
- `POST /corrective-actions` 响应中的 `capa_no` 格式不变。
- 请求 DTO 不变，调用方仍不传编号。

### 页面影响

- `/non-conformances` 列表继续展示 `nc_no`。
- `/corrective-actions` 列表和详情继续展示 `capa_no`。
- 不需要前端改动。

## 历史数据和迁移策略

历史 `NonConformance` 和 `CorrectiveAction` 数据不改号、不重排。

迁移只创建序列表。执行 agent 可以选择不回填序列表初始值，而是在第一次生成编号时按对应业务表当前最大编号初始化；推荐实现如下：

1. 生成 `NC-YYYY-####` 时，若 `business_number_sequences` 中没有 `company_id + non_conformance + YYYY` 行，查询当前公司当前年份已有 `NonConformance.nc_no` 的最大末尾数字。
2. 用最大末尾数字通过 `INSERT ... ON CONFLICT DO NOTHING` 初始化序列行。
3. 在同一事务中锁定序列行，递增后生成下一号。
4. CAPA 同理，查询 `CorrectiveAction.capa_no`。

这样可以兼容已有历史数据，又不需要在 migration 中解析所有历史编号。

## Superpower 与 grill-me 校准记录

- **brainstorming 结论：** 在数据库中新增最小业务序列表，并由 NC/CAPA 两个服务复用同一个序列生成服务。相比 `count()+1`，它能在事务内原子递增；相比文控 `NumberRule`，它不混入部门/文档编号语义；相比时间戳随机号，它保留年度连续可读编号。
- **grill-with-docs 校准：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计只增强治理记录编号，不改主追溯链。
  - 不重复创建 `NonConformance` 或 `CorrectiveAction` 事实源；新增表只是序列游标。
  - 不引入平行批次链路，不触碰 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
  - 不需要迁移历史业务数据；历史编号保持原样。
  - 不需要用户业务确认；保持现有编号格式和年度序列语义。
  - 可拆成独立小 PR：schema/migration + 序列服务 + 两个 service 替换 + 聚焦测试。
  - 执行 agent 可按 `superpowers:executing-plans` 独立完成；如发现当前代码已改为其他安全序列机制，必须停止并回报。

## 验收标准

- `NonConformanceService.create()` 不再调用 `prisma.nonConformance.count()` 生成编号。
- `CorrectiveActionService.create()` 不再调用 `prisma.correctiveAction.count()` 生成编号。
- 新增序列服务在同一公司、同一年、同一 scope 下连续生成不同编号。
- 不同公司之间序列互不影响。
- NC 和 CAPA 彼此使用不同 scope，互不抢占序号。
- 当已有当前年份历史编号时，第一次新编号从历史最大序号之后开始。
- 并发生成测试能证明同一 scope 下不会产生重复编号。
- `npm run test -w server -- non-conformance.service.spec.ts corrective-action.service.spec.ts quality-number-sequence.service.spec.ts --runInBand` 通过。
- `npm run build:server` 通过。
- `npx prisma validate --schema=server/src/prisma/schema.prisma` 通过。
